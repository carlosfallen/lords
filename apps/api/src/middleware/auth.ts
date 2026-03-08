// ============================================================
// JWT Auth Middleware — Bun native implementation
// ============================================================
import { SignJWT, jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET not defined. Using insecure fallback "dev-secret".');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me');

export interface TokenPayload {
    sub: string;
    email: string;
    role: string;
    tenantId?: string | null;
    representativeId?: string;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(JWT_SECRET);
}

export async function signRefreshToken(userId: string): Promise<string> {
    return new SignJWT({ sub: userId })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_REFRESH_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as TokenPayload;
    } catch {
        return null;
    }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
        return payload as unknown as { sub: string };
    } catch {
        return null;
    }
}

export function getUser(req: Request): TokenPayload {
    return (req as any)._user;
}

// ─── RBAC Check ─────────────────────────────────────────────
const ROLE_HIERARCHY: Record<string, number> = {
    super_admin: 100,
    admin: 90,
    mentor: 70,
    finance: 60,
    support: 50,
    client_owner: 30,
    client_staff: 10,
};

export function requireRole(...roles: string[]) {
    return (req: Request): boolean => {
        const user = getUser(req);
        if (!user) return false;
        return roles.includes(user.role) || user.role === 'super_admin';
    };
}

export function requireMinRole(minRole: string) {
    return (req: Request): boolean => {
        const user = getUser(req);
        if (!user) return false;
        return (ROLE_HIERARCHY[user.role] || 0) >= (ROLE_HIERARCHY[minRole] || 100);
    };
}

export function requireInternal() {
    return (req: Request): boolean => {
        const user = getUser(req);
        if (!user) return false;
        return ['super_admin', 'admin', 'gestor', 'financeiro', 'atendimento'].includes(user.role);
    };
}
