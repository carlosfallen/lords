// ============================================================
// JWT Auth Middleware — Workers-compatible (jose)
// ============================================================
import { SignJWT, jwtVerify } from 'jose';
import type { Context, Next } from 'hono';
import type { Env, TokenPayload } from '../types';

function getSecret(env: Env): Uint8Array {
    return new TextEncoder().encode(env.JWT_SECRET || 'dev-secret-change-me');
}

function getRefreshSecret(env: Env): Uint8Array {
    return new TextEncoder().encode(env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me');
}

export async function signAccessToken(payload: TokenPayload, env: Env): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(getSecret(env));
}

export async function signRefreshToken(userId: string, env: Env): Promise<string> {
    return new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getRefreshSecret(env));
}

export async function verifyToken(token: string, env: Env): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, getSecret(env));
        return payload as unknown as TokenPayload;
    } catch {
        return null;
    }
}

export async function verifyRefreshToken(token: string, env: Env): Promise<{ sub: string } | null> {
    try {
        const { payload } = await jwtVerify(token, getRefreshSecret(env));
        return payload as unknown as { sub: string };
    } catch {
        return null;
    }
}

// ─── Hono Middleware ────────────────────────────────────────
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
    const path = new URL(c.req.url).pathname;
    const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/health'];

    if (publicPaths.includes(path)) {
        return next();
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const payload = await verifyToken(authHeader.slice(7), c.env);
    if (!payload) {
        return c.json({ success: false, error: 'Invalid token' }, 401);
    }

    c.set('user', payload);
    return next();
}

// ─── RBAC Helpers ───────────────────────────────────────────
export function getUser(c: Context): TokenPayload {
    return c.get('user');
}

export function requireRoles(...roles: string[]) {
    return (c: Context): boolean => {
        const user = getUser(c);
        if (!user) return false;
        return roles.includes(user.role) || user.role === 'super_admin';
    };
}

export function requireInternal(c: Context): boolean {
    const user = getUser(c);
    if (!user) return false;
    return ['super_admin', 'admin', 'gestor', 'financeiro', 'atendimento'].includes(user.role);
}
