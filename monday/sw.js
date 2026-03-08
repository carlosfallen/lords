/**
 * ProjectFlow — Service Worker
 * Estratégia: Cache-first para assets, Network-first para API
 * Suporta offline básico em celulares antigos
 */

const CACHE  = "projectflow-v1";
const ASSETS = ["/", "/index.html", "/assets/index.js", "/assets/index.css"];
const API_PREFIX = "/api/";

// ── Install: pré-cacheamento dos assets ──────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// ── Activate: limpa caches antigos ───────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: estratégia híbrida ─────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API: Network-first com fallback para cache
  if (url.pathname.startsWith(API_PREFIX)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok && request.method === "GET") {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then(r => r || new Response(
          JSON.stringify({ data: null, error: "Offline — dados em cache" }),
          { headers: { "Content-Type": "application/json" } }
        )))
    );
    return;
  }

  // Assets: Cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(c => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => caches.match("/index.html")); // SPA fallback
    })
  );
});

// ── Background sync para mutations offline ──
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(syncPendingMutations());
  }
});

async function syncPendingMutations() {
  // Lê IndexedDB onde o app salva mutations pendentes
  // e tenta re-enviar para a API quando voltar online
  const db = await openIDB();
  const mutations = await getAllFromStore(db, "pending_mutations");
  for (const mutation of mutations) {
    try {
      await fetch(mutation.url, { method: mutation.method, headers: mutation.headers, body: mutation.body });
      await deleteFromStore(db, "pending_mutations", mutation.id);
    } catch { /* retry later */ }
  }
}

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("projectflow", 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore("pending_mutations", { keyPath: "id" });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e);
  });
}
function getAllFromStore(db, store) {
  return new Promise((resolve) => {
    const tx  = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
}
function deleteFromStore(db, store, id) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = resolve;
  });
}
