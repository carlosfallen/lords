import axios, { AxiosError } from 'axios';
import type { Contact, ConversationWithContact, QueueStats, AuditLog, WhatsAppStatus } from '../types/index';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// ─── Auth: Read token from Zustand persisted store (imperio-auth) ─────────────
api.interceptors.request.use((req) => {
  try {
    const stored = localStorage.getItem('imperio-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.accessToken;
      if (token) req.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* ignore parse errors */ }
  return req;
});

// ─── Token refresh on 401 ─────────────────────────────────────────────────────
let isRefreshing = false;
let authFailed = false;
let failedQueue: { resolve: (v: any) => void; reject: (e: any) => void }[] = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

api.interceptors.request.use((req) => {
  // If auth has permanently failed, reject immediately to stop polling spam
  if (authFailed) {
    return Promise.reject(new axios.Cancel('Auth session expired'));
  }
  return req;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalReq = err.config as any;
    if (err.response?.status === 401 && !originalReq._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalReq.headers.Authorization = `Bearer ${token}`;
          return api(originalReq);
        });
      }

      originalReq._retry = true;
      isRefreshing = true;

      try {
        const stored = localStorage.getItem('imperio-auth');
        const refreshToken = stored ? JSON.parse(stored)?.state?.refreshToken : null;
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data.data;

        // Update Zustand persisted store
        const state = JSON.parse(localStorage.getItem('imperio-auth') || '{}');
        if (state.state) {
          state.state.accessToken = accessToken;
          state.state.refreshToken = newRefresh;
          localStorage.setItem('imperio-auth', JSON.stringify(state));
        }

        authFailed = false;
        originalReq.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        return api(originalReq);
      } catch (refreshErr) {
        processQueue(refreshErr);
        authFailed = true;
        console.warn('[BotProspect API] Session expired — redirecting to login');

        // Clear auth state and redirect to login
        try {
          const state = JSON.parse(localStorage.getItem('imperio-auth') || '{}');
          if (state.state) {
            state.state.accessToken = null;
            state.state.refreshToken = null;
            state.state.isAuthenticated = false;
            localStorage.setItem('imperio-auth', JSON.stringify(state));
          }
        } catch { /* ignore */ }

        // Redirect to login (only once)
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
export const waApi = {
  status: (): Promise<WhatsAppStatus> =>
    api.get('/bot/status').then((r) => {
      const d = r.data.data;
      return {
        connected: d.status === 'connected',
        phoneNumber: d.phoneNumber,
        session: d.status,
      };
    }),

  cachedStatus: (): Promise<WhatsAppStatus> =>
    api.get('/bot/status').then((r) => {
      const d = r.data.data;
      return {
        connected: d.status === 'connected',
        phoneNumber: d.phoneNumber,
        session: d.status,
      };
    }),

  qrCode: (): Promise<{ value: string; base64: string }> =>
    api.get('/bot/qrcode').then((r) => {
      if (r.data?.success && r.data?.data?.value) {
        return r.data.data;
      }
      throw new Error(r.data?.error || 'QR não disponível');
    }),

  disconnect: () =>
    api.post('/bot/disconnect').then((r) => r.data),

  reconnect: () =>
    api.post('/bot/reconnect').then((r) => r.data),
};

// ─── Contacts ─────────────────────────────────────────────────────────────────
export const contactsApi = {
  list: (params?: Record<string, string | number>): Promise<{ contacts: Contact[]; total: number }> =>
    api.get('/prospect/contacts', { params }).then((r) => ({
      contacts: r.data.data,
      total: r.data.data.length,
    })),

  stats: (): Promise<Record<string, number>> =>
    Promise.resolve({}),

  create: (data: { name: string; company?: string; phone: string; email?: string; opt_in?: boolean }): Promise<Contact> =>
    api.post('/prospect/contacts', data).then((r) => r.data.data),

  import: (file: File, grantOptin: boolean): Promise<{ inserted: number; skipped: number; total_rows: number }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(Boolean);
        const contacts = lines.slice(1).map(l => {
          const parts = l.split(',');
          return { name: parts[0], company: parts[1], phone: parts[2], email: parts[3], optIn: grantOptin };
        });
        const res = await api.post('/prospect/contacts/import', { contacts });
        resolve({ inserted: res.data.data.importedCount, skipped: 0, total_rows: contacts.length });
      };
      reader.readAsText(file);
    });
  },

  setOptIn: (id: string, optIn: boolean): Promise<Contact> =>
    api.patch(`/prospect/contacts/${id}/opt-in`, { optIn }).then((r) => r.data.data),

  enqueue: (params?: { ids?: string[]; campaign_id?: string; priority?: number }) =>
    api.post('/prospect/queue/enqueue', { contactIds: params?.ids, campaignId: params?.campaign_id }).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete(`/prospect/contacts/${id}`).then((r) => r.data),
};

// ─── Conversations & Queue ────────────────────────────────────────────────────
export const conversationsApi = {
  list: (params?: { status?: string; limit?: number; offset?: number }): Promise<ConversationWithContact[]> =>
    api.get('/bot/conversations', { params }).then((r) => r.data.data || []),

  get: (id: string): Promise<ConversationWithContact> =>
    api.get(`/bot/conversations/${id}/messages`).then((r) => r.data.data),

  takeover: (id: string, botActive: boolean) =>
    api.post(`/bot/conversations/${id}/takeover`).then((r) => r.data.data),

  sendMessage: (id: string, message: string) =>
    api.post(`/bot/conversations/${id}/send`, { content: message }).then((r) => r.data.data),

  complete: (id: string, result: string) =>
    Promise.resolve({}),

  audit: (id: string): Promise<AuditLog[]> =>
    Promise.resolve([]),

  queueStats: (): Promise<QueueStats> =>
    api.get('/prospect/queue/status').then((r) => {
      const d = r.data.data;
      return {
        total: (d.stats?.pending || 0) + (d.stats?.processed || 0) + (d.stats?.failed || 0),
        pending: d.stats?.pending || 0,
        inProgress: 0,
        scheduled: 0,
        noInterest: d.stats?.failed || 0,
        done: d.stats?.processed || 0,
        optInRequired: 0,
        isRunning: d.isRunning || false,
        processing: 0,
      };
    }),

  startQueue: () => api.post('/prospect/queue/start').then((r) => r.data.data),
  stopQueue: () => api.post('/prospect/queue/stop').then((r) => r.data.data),
  clearQueue: () => Promise.resolve({}),
};

// ─── Logs ─────────────────────────────────────────────────────────────────────
export const logsApi = {
  list: (params?: Record<string, string | number>): Promise<AuditLog[]> =>
    api.get('/audit', { params }).then((r) => r.data.data || []),

  messages: (params?: Record<string, string | number>) =>
    api.get('/bot/metrics', { params }).then((r) => r.data.data),

  devToken: () => Promise.resolve({ token: '' }),
};
