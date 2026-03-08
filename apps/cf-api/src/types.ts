// ============================================================
// Lords CRM — Cloudflare Worker Types
// ============================================================
export interface Env {
    DB: D1Database;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    CORS_ORIGINS: string;
    WHATSAPP_GW_URL: string;
    CF_ACCESS_CLIENT_ID?: string;
    CF_ACCESS_CLIENT_SECRET?: string;
    ENVIRONMENT: string;
    GROQ_API_KEY?: string;
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
}

export interface TokenPayload {
    sub: string;
    email: string;
    role: string;
    tenantId?: string | null;
    representativeId?: string;
}

// Utility: generate UUID (crypto.randomUUID is available in Workers)
export function newId(): string {
    return crypto.randomUUID();
}

// Utility: current ISO timestamp
export function now(): string {
    return new Date().toISOString();
}
