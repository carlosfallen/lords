// ============================================================
// Auth Routes — D1 + Workers
// ============================================================
import { Hono } from 'hono';
import type { Env } from '../types';
import { newId, now } from '../types';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { query, queryOne, execute, insertReturning } from '../db';

const auth = new Hono<{ Bindings: Env }>();

// ─── Password Hashing (Workers-compatible via Web Crypto) ───
// Workers don't have Bun.password or bcrypt. We use PBKDF2.
async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        key, 256
    );
    const hashArr = new Uint8Array(derived);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(hashArr).map(b => b.toString(16).padStart(2, '0')).join('');
    return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
    // Support both PBKDF2 (new) and legacy passwords
    if (!stored.startsWith('pbkdf2:')) {
        // Fallback: simple comparison for migration period
        // In production you'd need to handle argon2 hashes from the old system
        return false;
    }
    const [, iterations, saltHex, hashHex] = stored.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: Number(iterations), hash: 'SHA-256' },
        key, 256
    );
    const computedHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHex === hashHex;
}

// ─── POST /api/auth/login ───────────────────────────────────
auth.post('/api/auth/login', async (c) => {
    const { email, password } = await c.req.json();
    if (!email || !password) {
        return c.json({ success: false, error: 'Email and password required' }, 400);
    }

    const db = c.env.DB;
    const user = await queryOne<any>(db, 'SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (!user || !user.is_active) {
        return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
        return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Update last login
    await execute(db, 'UPDATE users SET last_login_at = ? WHERE id = ?', [now(), user.id]);

    // Check if representative
    let representativeId: string | undefined;
    if (user.role === 'representante') {
        const rep = await queryOne<any>(db, 'SELECT id FROM representatives WHERE user_id = ? LIMIT 1', [user.id]);
        if (rep) representativeId = rep.id;
    }

    const accessToken = await signAccessToken({
        sub: user.id, email: user.email, role: user.role,
        tenantId: user.tenant_id, representativeId,
    }, c.env);
    const refreshTokenValue = await signRefreshToken(user.id, c.env);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await execute(db, 'DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
    await execute(db, 'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [newId(), user.id, refreshTokenValue, expiresAt]);

    return c.json({
        success: true,
        data: {
            user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id, mustChangePassword: !!user.must_change_password },
            accessToken,
            refreshToken: refreshTokenValue,
        },
    });
});

// ─── POST /api/auth/register ────────────────────────────────
auth.post('/api/auth/register', async (c) => {
    const { email, password, name, role } = await c.req.json();
    if (!email || !password || !name) {
        return c.json({ success: false, error: 'Email, password and name required' }, 400);
    }

    const db = c.env.DB;
    const existing = await queryOne(db, 'SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing) {
        return c.json({ success: false, error: 'User already exists' }, 409);
    }

    const passwordHash = await hashPassword(password);
    const userId = newId();
    await execute(db,
        'INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, email, passwordHash, name, role || 'support', now(), now()]
    );

    const newUser = await queryOne<any>(db, 'SELECT * FROM users WHERE id = ?', [userId]);

    const accessToken = await signAccessToken({
        sub: newUser.id, email: newUser.email, role: newUser.role, tenantId: newUser.tenant_id,
    }, c.env);
    const refreshTokenValue = await signRefreshToken(newUser.id, c.env);

    return c.json({
        success: true,
        data: {
            user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, tenantId: newUser.tenant_id },
            accessToken, refreshToken: refreshTokenValue,
        },
    });
});

// ─── POST /api/auth/refresh ─────────────────────────────────
auth.post('/api/auth/refresh', async (c) => {
    const { refreshToken: token } = await c.req.json();
    if (!token) {
        return c.json({ success: false, error: 'Refresh token required' }, 400);
    }

    const payload = await verifyRefreshToken(token, c.env);
    if (!payload) {
        return c.json({ success: false, error: 'Invalid refresh token' }, 401);
    }

    const db = c.env.DB;
    const stored = await queryOne<any>(db,
        'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > ? LIMIT 1',
        [token, now()]
    );
    if (!stored) {
        return c.json({ success: false, error: 'Refresh token revoked or expired' }, 401);
    }

    const user = await queryOne<any>(db, 'SELECT * FROM users WHERE id = ? LIMIT 1', [payload.sub]);
    if (!user) {
        return c.json({ success: false, error: 'User not found' }, 401);
    }

    // Rotate tokens
    await execute(db, 'DELETE FROM refresh_tokens WHERE token = ?', [token]);

    let representativeId: string | undefined;
    if (user.role === 'representante') {
        const rep = await queryOne<any>(db, 'SELECT id FROM representatives WHERE user_id = ? LIMIT 1', [user.id]);
        if (rep) representativeId = rep.id;
    }

    const accessToken = await signAccessToken({
        sub: user.id, email: user.email, role: user.role,
        tenantId: user.tenant_id, representativeId,
    }, c.env);
    const newRefreshToken = await signRefreshToken(user.id, c.env);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await execute(db, 'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [newId(), user.id, newRefreshToken, expiresAt]);

    return c.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
});

// ─── POST /api/auth/change-password ─────────────────────────
auth.post('/api/auth/change-password', async (c) => {
    const user = c.get('user');
    if (!user) return c.json({ success: false, error: 'Unauthorized' }, 401);

    const { currentPassword, newPassword } = await c.req.json();
    if (!newPassword) return c.json({ success: false, error: 'New password is required' }, 400);

    const db = c.env.DB;
    const dbUser = await queryOne<any>(db, 'SELECT * FROM users WHERE id = ? LIMIT 1', [user.sub]);
    if (!dbUser) return c.json({ success: false, error: 'User not found' }, 404);

    if (currentPassword) {
        const valid = await verifyPassword(currentPassword, dbUser.password_hash);
        if (!valid) return c.json({ success: false, error: 'Invalid current password' }, 401);
    }

    const passwordHash = await hashPassword(newPassword);
    await execute(db, 'UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?',
        [passwordHash, now(), user.sub]);

    return c.json({ success: true });
});

export default auth;
