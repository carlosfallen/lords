// ============================================================
// Users Routes — D1
// ============================================================
import { Hono } from 'hono';
import type { Env } from '../types';
import { newId, now } from '../types';
import { query, queryOne, execute } from '../db';
import { getUser } from '../middleware/auth';
import { createAuditLog } from './audit';

const users = new Hono<{ Bindings: Env }>();

// Password hashing (PBKDF2 — Workers compatible)
async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

const ADMIN_ROLES = ['super_admin', 'admin', 'gestor'];

users.get('/api/users', async (c) => {
    const user = getUser(c);
    if (!ADMIN_ROLES.includes(user?.role)) return c.json({ success: false, error: 'Forbidden' }, 403);

    const allUsers = await query(c.env.DB,
        `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.last_login_at, u.created_at,
         r.commission_percent, r.id as representative_id
         FROM users u LEFT JOIN representatives r ON u.id = r.user_id ORDER BY u.created_at DESC`);
    return c.json({ success: true, data: allUsers });
});

users.post('/api/users', async (c) => {
    const body = await c.req.json();
    const user = getUser(c);
    if (!ADMIN_ROLES.includes(user?.role)) return c.json({ success: false, error: 'Forbidden' }, 403);

    const db = c.env.DB;
    const passwordHash = await hashPassword(body.password || 'senha123');
    const userId = newId(); const ts = now();

    await execute(db,
        `INSERT INTO users (id, name, email, phone, role, password_hash, must_change_password, tenant_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [userId, body.name, body.email, body.phone, body.role, passwordHash, user.tenantId, ts, ts]);

    if (body.role === 'representante') {
        await execute(db,
            `INSERT INTO representatives (id, user_id, display_name, commission_percent, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, 1, ?, ?)`,
            [newId(), userId, body.name, body.commissionPercent || 15.0, ts, ts]);
    }

    await createAuditLog(db, { userId: user.sub, action: 'USER_CREATED', entityType: 'user', entityId: userId });
    const newUser = await queryOne(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    return c.json({ success: true, data: newUser }, 201);
});

users.put('/api/users/:id/status', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const user = getUser(c);
    if (!ADMIN_ROLES.includes(user?.role)) return c.json({ success: false, error: 'Forbidden' }, 403);

    const db = c.env.DB;
    await execute(db, 'UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?', [body.isActive ? 1 : 0, now(), id]);
    await execute(db, 'UPDATE representatives SET is_active = ?, updated_at = ? WHERE user_id = ?', [body.isActive ? 1 : 0, now(), id]);

    await createAuditLog(db, { userId: user.sub, action: body.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', entityType: 'user', entityId: id });
    const updated = await queryOne(db, 'SELECT * FROM users WHERE id = ?', [id]);
    return c.json({ success: true, data: updated });
});

users.put('/api/users/:id/reset-password', async (c) => {
    const id = c.req.param('id');
    const user = getUser(c);
    if (!ADMIN_ROLES.includes(user?.role)) return c.json({ success: false, error: 'Forbidden' }, 403);

    const passwordHash = await hashPassword('senha123');
    await execute(c.env.DB, 'UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?', [passwordHash, now(), id]);
    await createAuditLog(c.env.DB, { userId: user.sub, action: 'USER_PASSWORD_RESET', entityType: 'user', entityId: id });
    return c.json({ success: true, message: 'Password reset to senha123' });
});

users.put('/api/users/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const user = getUser(c);
    if (!ADMIN_ROLES.includes(user?.role)) return c.json({ success: false, error: 'Forbidden' }, 403);

    const db = c.env.DB;
    await execute(db, 'UPDATE users SET name = ?, email = ?, phone = ?, role = ?, updated_at = ? WHERE id = ?',
        [body.name, body.email, body.phone, body.role, now(), id]);

    if (body.role === 'representante' && body.commissionPercent) {
        const rep = await queryOne(db, 'SELECT id FROM representatives WHERE user_id = ?', [id]);
        if (rep) {
            await execute(db, 'UPDATE representatives SET commission_percent = ?, updated_at = ? WHERE user_id = ?',
                [body.commissionPercent, now(), id]);
        } else {
            await execute(db,
                `INSERT INTO representatives (id, user_id, display_name, commission_percent, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, 1, ?, ?)`, [newId(), id, body.name, body.commissionPercent, now(), now()]);
        }
    }

    await createAuditLog(db, { userId: user.sub, action: 'USER_UPDATED', entityType: 'user', entityId: id });
    const updated = await queryOne(db, 'SELECT * FROM users WHERE id = ?', [id]);
    return c.json({ success: true, data: updated });
});

export default users;
