// ============================================================
// Socket Service — Graceful WebSocket (no Socket.IO dependency)
// ============================================================
// The CRM backend uses native WebSocket at /ws, not Socket.IO.
// This module provides a minimal event emitter over native WS.

let ws: WebSocket | null = null;
let reconnectTimer: any = null;
const listeners = new Map<string, Set<Function>>();

export const SocketEvent = {
  CONVERSATION_NEW: 'conversation:new',
  CONVERSATION_UPDATED: 'conversation:updated',
  CONVERSATION_COMPLETED: 'conversation:completed',
  CONVERSATION_NEEDS_HUMAN: 'conversation:needs_human',
  CONVERSATION_ERROR: 'conversation:error',
  MESSAGE_NEW: 'message:new',
  MESSAGE_STATUS: 'message:status',
  WA_MESSAGE: 'wa.message',
  QUEUE_UPDATED: 'queue:updated',
  WA_STATUS: 'whatsapp:status',
  WA_QR: 'whatsapp:qr',
  WA_DISCONNECTED: 'whatsapp:disconnected',
} as const;

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('imperio-auth');
    if (stored) {
      const token = JSON.parse(stored)?.state?.accessToken;
      if (!token) return null;
      // Check if token is expired before using it
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) return null;
      } catch { /* if we can't parse, let the server reject it */ }
      return token;
    }
  } catch { /* ignore */ }
  return null;
}

function createSocket(): WebSocket | null {
  // Skip WS entirely in Cloudflare Pages deployment (no WS server)
  const wsBase = import.meta.env.VITE_WS_URL as string | undefined;
  if (!wsBase) return null;

  const token = getToken();
  if (!token) return null;

  const url = `${wsBase}/ws?token=${token}`;

  try {
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.log('[BotProspect WS] Connected');
    };

    socket.onmessage = (evt) => {
      try {
        const { event, data } = JSON.parse(evt.data);
        const handlers = listeners.get(event);
        if (handlers) {
          handlers.forEach((fn) => fn(data));
        }
      } catch { /* ignore malformed messages */ }
    };

    socket.onclose = () => {
      console.log('[BotProspect WS] Disconnected, reconnecting in 5s...');
      ws = null;
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          ws = createSocket();
        }, 5000);
      }
    };

    socket.onerror = () => {
      // Silently handle — onclose will fire after this
    };

    return socket;
  } catch {
    return null;
  }
}

// Minimal Socket-like interface for compatibility with existing hooks
const socketProxy = {
  get connected() {
    return ws?.readyState === WebSocket.OPEN;
  },
  on(event: string, fn: Function) {
    if (event === 'connect' || event === 'disconnect') {
      // These are connection lifecycle events, not data events
      // We handle them internally
      return;
    }
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(fn);
  },
  off(event: string, fn?: Function) {
    if (fn) {
      listeners.get(event)?.delete(fn);
    } else {
      listeners.delete(event);
    }
  },
  disconnect() {
    ws?.close();
    ws = null;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  },
};

export function getSocket(): typeof socketProxy {
  if (!ws) {
    ws = createSocket();
  }
  return socketProxy;
}

export function disconnectSocket(): void {
  socketProxy.disconnect();
}
