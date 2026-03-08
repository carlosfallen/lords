// ============================================================
// Audit Routes + Utility — D1
// ============================================================
import { Hono } from 'hono';
import type { Env } from '../types';
import { newId, now } from '../types';
import { query, execute } from '../db';
import { getUser } from '../middleware/auth';

const audit = new Hono<{ Bindings: Env }>();

// ─── Audit Log Writer (used by other routes) ────────────────
export async function createAuditLog(db: D1Database, params: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    justification?: string;
    changes?: Record<string, unknown>;
    ipAddress?: string;
}) {
    try {
        await execute(db,
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, field_name, old_value, new_value, justification, changes, ip_address, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                params.userId, params.action, params.entityType, params.entityId,
                params.fieldName || null, params.oldValue || null, params.newValue || null,
                params.justification || null, params.changes ? JSON.stringify(params.changes) : null,
                params.ipAddress || null, now(),
            ]
        );
    } catch (err) {
        console.error('Failed to create audit log:', err);
    }
}

// ─── GET /api/audit ─────────────────────────────────────────
audit.get('/api/audit', async (c) => {
    const url = new URL(c.req.url);
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 50;
    const offset = (page - 1) * limit;

    const db = c.env.DB;
    const logs = await query(db,
        `SELECT a.id, a.action, a.entity_type, a.entity_id, a.changes, a.ip_address, a.created_at, u.name as user_name, u.role as user_role
         FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id
         ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
    );

    return c.json({ success: true, data: logs });
});

export default audit;
