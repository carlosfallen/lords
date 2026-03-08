// ============================================================
// WhatsApp Gateway Routes — via Cloudflare Tunnel
// ============================================================
import { Hono } from 'hono';
import type { Env } from '../types';
import { newId, now } from '../types';
import { queryOne, execute } from '../db';
import { getUser } from '../middleware/auth';

const whatsapp = new Hono<{ Bindings: Env }>();

// ─── POST /api/whatsapp/send ────────────────────────────────
// Proxies message to local WhatsApp Gateway via Tunnel.
// Falls back to queue if gateway is offline.
whatsapp.post('/api/whatsapp/send', async (c) => {
    const user = getUser(c);
    const { phone, message, tenantId } = await c.req.json();

    if (!phone || !message) {
        return c.json({ success: false, error: 'phone and message required' }, 400);
    }

    const gwUrl = c.env.WHATSAPP_GW_URL;
    if (!gwUrl) {
        // Queue for later
        await execute(c.env.DB,
            `INSERT INTO wa_message_queue (id, phone, message, tenant_id, status, created_at)
             VALUES (?, ?, ?, ?, 'pending', ?)`,
            [newId(), phone, message, tenantId || user?.tenantId, now()]);
        return c.json({ success: true, queued: true, message: 'Gateway offline - message queued' });
    }

    try {
        // Forward to local gateway via Tunnel
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        // Add Cloudflare Access service token if configured
        if (c.env.CF_ACCESS_CLIENT_ID && c.env.CF_ACCESS_CLIENT_SECRET) {
            headers['CF-Access-Client-Id'] = c.env.CF_ACCESS_CLIENT_ID;
            headers['CF-Access-Client-Secret'] = c.env.CF_ACCESS_CLIENT_SECRET;
        }

        const resp = await fetch(`${gwUrl}/api/send`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ phone, text: message, tenantId: tenantId || user?.tenantId }),
        });

        if (!resp.ok) {
            // Queue if gateway returned error
            await execute(c.env.DB,
                `INSERT INTO wa_message_queue (id, phone, message, tenant_id, status, last_error, created_at)
                 VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
                [newId(), phone, message, tenantId || user?.tenantId, `Gateway error: ${resp.status}`, now()]);
            return c.json({ success: true, queued: true, message: `Gateway error ${resp.status} - queued` });
        }

        const data = await resp.json();
        return c.json({ success: true, data });
    } catch (err: any) {
        // Gateway unreachable — queue
        await execute(c.env.DB,
            `INSERT INTO wa_message_queue (id, phone, message, tenant_id, status, last_error, created_at)
             VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
            [newId(), phone, message, tenantId || user?.tenantId, err.message || 'Gateway unreachable', now()]);
        return c.json({ success: true, queued: true, message: 'Gateway unreachable - message queued' });
    }
});

// ─── GET /api/whatsapp/status ───────────────────────────────
whatsapp.get('/api/whatsapp/status', async (c) => {
    const gwUrl = c.env.WHATSAPP_GW_URL;
    if (!gwUrl) return c.json({ success: true, data: { status: 'not_configured' } });

    try {
        const headers: Record<string, string> = {};
        if (c.env.CF_ACCESS_CLIENT_ID && c.env.CF_ACCESS_CLIENT_SECRET) {
            headers['CF-Access-Client-Id'] = c.env.CF_ACCESS_CLIENT_ID;
            headers['CF-Access-Client-Secret'] = c.env.CF_ACCESS_CLIENT_SECRET;
        }
        const resp = await fetch(`${gwUrl}/api/status`, { headers });
        if (!resp.ok) return c.json({ success: true, data: { status: 'error', code: resp.status } });
        const data = await resp.json();
        return c.json({ success: true, data });
    } catch {
        return c.json({ success: true, data: { status: 'offline' } });
    }
});

// ─── GET /api/whatsapp/queue ────────────────────────────────
whatsapp.get('/api/whatsapp/queue', async (c) => {
    const db = c.env.DB;
    const pending = await queryOne<any>(db, `SELECT COUNT(*) as total FROM wa_message_queue WHERE status = 'pending'`);
    return c.json({ success: true, data: { pending: pending?.total || 0 } });
});

export default whatsapp;
