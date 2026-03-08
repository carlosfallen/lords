// ============================================================
// Auth Store — Zustand
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    mustChangePassword?: boolean;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<User | null>;
    logout: () => void;
    setTokens: (access: string, refresh: string) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,

            login: async (email: string, password: string) => {
                try {
                    const baseUrl = import.meta.env.VITE_API_URL || '/api';
                    const finalUrl = baseUrl.endsWith('/api') ? `${baseUrl}/auth/login` : `${baseUrl}/api/auth/login`;
                    const res = await fetch(finalUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        set({
                            user: data.data.user,
                            accessToken: data.data.accessToken,
                            refreshToken: data.data.refreshToken,
                            isAuthenticated: true,
                        });
                        return data.data.user;
                    }
                    return null;
                } catch {
                    return false;
                }
            },

            logout: () => {
                set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
            },

            setTokens: (access, refresh) => {
                set({ accessToken: access, refreshToken: refresh });
            },
        }),
        { name: 'imperio-auth' }
    )
);

// ============================================================
// API helper with auth token — uses VITE_API_URL for CF Workers
// ============================================================
export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const finalPath = (baseUrl.endsWith('/api') && path.startsWith('/api')) ? baseUrl + path.substring(4) : baseUrl + path;
    const res = await fetch(finalPath, { ...options, headers });
    if (res.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }
    return res.json();
}
