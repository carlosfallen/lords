import axios, { AxiosError } from 'axios';
import type { Lead, LeadWithMessages, Message, QueueStats, QueueItem, Campaign, WhatsAppStatus } from '../types/index';

export const api = axios.create({
  baseURL: '/api',
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
  if (authFailed) return Promise.reject(new axios.Cancel('Auth session expired'));
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

        try {
          const state = JSON.parse(localStorage.getItem('imperio-auth') || '{}');
          if (state.state) {
            state.state.accessToken = null;
            state.state.refreshToken = null;
            state.state.isAuthenticated = false;
            localStorage.setItem('imperio-auth', JSON.stringify(state));
          }
        } catch { /* ignore */ }

        if (window.location.pathname !== '/login') window.location.href = '/login';
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
    api.get('/bot/status').then((r) => ({
      connected: r.data.data?.status === 'connected',
      phoneNumber: r.data.data?.phoneNumber,
      session: r.data.data?.status,
    })),

  qrCode: (): Promise<{ value: string; base64: string }> =>
    api.get('/bot/qrcode').then((r) => {
      if (r.data?.success && r.data?.data?.value) return r.data.data;
      throw new Error(r.data?.error || 'QR não disponível');
    }),

  disconnect: () => api.post('/bot/disconnect').then((r) => r.data),
  reconnect: () => api.post('/bot/reconnect').then((r) => r.data),
};

// ─── Real CRM Leads (source of truth for prospecting) ─────────────────────────
export const leadsApi = {
  /** List real CRM leads — the same leads from Controle de Leads */
  list: (params?: Record<string, string | number>): Promise<Lead[]> =>
    api.get('/prospect/contacts', { params }).then((r) => r.data.data || []),

  /** Delete a real CRM lead */
  delete: (id: string) =>
    api.delete(`/prospect/contacts/${id}`).then((r) => r.data),

  /** Enqueue selected lead IDs into the prospecting queue */
  enqueue: (leadIds: string[], campaignId: string) =>
    api.post('/prospect/queue/enqueue', { contactIds: leadIds, campaignId }).then((r) => r.data.data),
};

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaignsApi = {
  list: (): Promise<Campaign[]> =>
    api.get('/prospect/campaigns').then((r) => r.data.data || []),

  create: (data: { name: string; playbookBasePrompt?: string }) =>
    api.post('/prospect/campaigns', data).then((r) => r.data.data),
};

// ─── Conversations (from bot routes — operates on leads + leadConversations) ──
export const conversationsApi = {
  /** List all leads that have WA conversations */
  list: (): Promise<any[]> =>
    api.get('/bot/conversations').then((r) => r.data.data || []),

  /** Get messages for a specific lead (conversation history from leadConversations) */
  getMessages: (leadId: string): Promise<{ lead: any; messages: Message[] }> =>
    api.get(`/bot/conversations/${leadId}/messages`).then((r) => r.data.data),

  /** Human takeover toggle */
  takeover: (leadId: string) =>
    api.post(`/bot/conversations/${leadId}/takeover`).then((r) => r.data.data),

  /** Mark conversation as complete with result */
  complete: (leadId: string, result: string) =>
    api.post(`/bot/conversations/${leadId}/complete`, { result }).then((r) => r.data.data),

  /** Send a human operator message  */
  sendMessage: (leadId: string, message: string) =>
    api.post(`/bot/conversations/${leadId}/send`, { content: message }).then((r) => r.data.data),
};

// ─── Queue (real DB persisted counts) ─────────────────────────────────────────
export const queueApi = {
  stats: (): Promise<QueueStats> =>
    api.get('/prospect/queue/status').then((r) => {
      const d = r.data.data;
      return {
        total: (d.stats?.pending || 0) + (d.stats?.active || 0) + (d.stats?.processed || 0) + (d.stats?.failed || 0),
        pending: d.stats?.pending || 0,
        active: d.stats?.active || 0,
        done: d.stats?.processed || 0,
        failed: d.stats?.failed || 0,
        isRunning: d.isRunning || false,
      };
    }),

  list: (params?: { limit?: number }): Promise<QueueItem[]> =>
    api.get('/prospect/queue', { params }).then((r) => r.data.data || []),

  start: () => api.post('/prospect/queue/start').then((r) => r.data.data),
  stop: () => api.post('/prospect/queue/stop').then((r) => r.data.data),
};

// ─── Config ───────────────────────────────────────────────────────────────────
export const configApi = {
  getBot: (): Promise<any> => api.get('/config/bot').then((r) => r.data.data),
  updateBot: (data: any): Promise<any> => api.post('/config/bot', data).then((r) => r.data),
  getModels: (): Promise<any[]> => api.get('/config/models').then((r) => r.data.data),
  getAiStatus: (): Promise<any[]> => api.get('/config/ai-status').then((r) => r.data.data),
};

// ─── Health (used by Monitoring page) ─────────────────────────────────────────
export const healthApi = {
  services: (): Promise<{ name: string; status: string; state: string; image: string; up: boolean }[]> =>
    api.get('/health/services').then((r) => r.data.services),

  logs: (name: string): Promise<string> =>
    api.get(`/health/logs/${name}`).then((r) => r.data.logs),
};
