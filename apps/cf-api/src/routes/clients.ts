// ============================================================
// Clients Routes — D1
// ============================================================
import { Hono } from 'hono';
import type { Env } from '../types';
import { newId, now } from '../types';
import { query, queryOne, execute } from '../db';
import { getUser } from '../middleware/auth';

const clients = new Hono<{ Bindings: Env }>();

clients.get('/api/clients', async (c) => {
    const url = new URL(c.req.url);
    const search = url.searchParams.get('search') || '';
    const segment = url.searchParams.get('segment') || '';
    const page = Number(url.searchParams.get('page')) || 1;
    const limit = Number(url.searchParams.get('limit')) || 50;
    const db = c.env.DB;

    let sql = `SELECT t.id, t.name, t.niche, t.city, t.state, t.segment, t.tags, t.email, t.phone,
        u.name as mentor_name, t.created_at, t.updated_at
        FROM tenants t LEFT JOIN users u ON t.mentor_id = u.id WHERE t.is_active = 1`;
    const params: unknown[] = [];
    if (search) { sql += ' AND LOWER(t.name) LIKE ?'; params.push(`%${search.toLowerCase()}%`); }
    if (segment) { sql += ' AND t.segment = ?'; params.push(segment); }
    sql += ' ORDER BY t.updated_at DESC';

    const allTenants = await query<any>(db, sql, params);
    const contracts = await query<any>(db, `SELECT tenant_id, monthly_value FROM client_contracts WHERE status = 'active'`);
    const mrrMap = new Map<string, number>();
    for (const ct of contracts) mrrMap.set(ct.tenant_id, (mrrMap.get(ct.tenant_id) || 0) + Number(ct.monthly_value));

    const scores = await query<any>(db, 'SELECT tenant_id, score FROM traction_scores ORDER BY calculated_at DESC');
    const scoreMap = new Map<string, number>();
    for (const s of scores) { if (!scoreMap.has(s.tenant_id)) scoreMap.set(s.tenant_id, s.score); }

    const enriched = allTenants.map((t: any) => ({
        ...t, tags: typeof t.tags === 'string' ? JSON.parse(t.tags || '[]') : t.tags,
        location: `${t.city}/${t.state}`, mrr: mrrMap.get(t.id) || 0, score: scoreMap.get(t.id) || 0,
    }));

    return c.json({
        success: true, data: enriched.slice((page - 1) * limit, page * limit),
        meta: { total: enriched.length, page, limit }
    });
});

clients.get('/api/clients/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.env.DB;
    const tenant = await queryOne<any>(db,
        `SELECT t.*, u.name as mentor_name FROM tenants t LEFT JOIN users u ON t.mentor_id = u.id WHERE t.id = ?`, [id]);
    if (!tenant) return c.json({ success: false, error: 'Client not found' }, 404);

    const [contract, products, traction, mot, missions, team] = await Promise.all([
        queryOne<any>(db, `SELECT * FROM client_contracts WHERE tenant_id = ? AND status = 'active' LIMIT 1`, [id]),
        query(db, 'SELECT * FROM client_products WHERE tenant_id = ?', [id]),
        query(db, 'SELECT score, calculated_at FROM traction_scores WHERE tenant_id = ? ORDER BY calculated_at DESC LIMIT 30', [id]),
        queryOne<any>(db, 'SELECT * FROM money_on_table_snapshots WHERE tenant_id = ? ORDER BY calculated_at DESC LIMIT 1', [id]),
        query(db, 'SELECT * FROM mentorship_tasks WHERE tenant_id = ? ORDER BY created_at DESC', [id]),
        query(db, 'SELECT * FROM client_team_members WHERE tenant_id = ?', [id]),
    ]);

    return c.json({
        success: true, data: {
            ...tenant, tags: typeof tenant.tags === 'string' ? JSON.parse(tenant.tags || '[]') : tenant.tags,
            location: `${tenant.city}/${tenant.state}`, mrr: Number(contract?.monthly_value || 0),
            plan: contract?.plan_name || '', score: (traction[0] as any)?.score || 0,
            systemsCount: (products as any[]).length,
            tractionHistory: (traction as any[]).reverse().map((t: any) => ({ score: t.score, date: t.calculated_at })),
            moneyOnTable: mot ? {
                total: Number(mot.total_lost), unansweredLeads: Number(mot.unanswered_leads_loss || 0),
                noShows: Number(mot.no_show_loss || 0), stuckLeads: Number(mot.stuck_leads_loss || 0)
            } : null,
            missions: (missions as any[]).map((m: any) => ({ id: m.id, title: m.title, status: m.status, priority: m.priority, dueDate: m.due_date })),
            systems: (products as any[]).map((p: any) => ({ id: p.id, name: p.name, type: p.system_type, status: p.status })),
            team: (team as any[]).map((t: any) => ({ id: t.id, name: t.name, role: t.role, totalAttendances: t.total_attendances })),
        }
    });
});

clients.post('/api/clients', async (c) => {
    const body = await c.req.json();
    const user = getUser(c);
    const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO tenants (id, name, trade_name, niche, email, phone, city, state, segment, mentor_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, body.name, body.tradeName, body.niche, body.email, body.phone, body.city, body.state, 'Crescendo', body.mentorId || user?.sub, ts, ts]);
    const newTenant = await queryOne(c.env.DB, 'SELECT * FROM tenants WHERE id = ?', [id]);
    return c.json({ success: true, data: newTenant }, 201);
});

clients.put('/api/clients/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const fieldMap: Record<string, string> = { name: 'name', tradeName: 'trade_name', niche: 'niche', email: 'email', phone: 'phone', city: 'city', state: 'state', segment: 'segment', notes: 'notes', tags: 'tags' };
    const sets: string[] = ['updated_at = ?']; const vals: unknown[] = [now()];
    for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
        if (body[jsKey] !== undefined) { sets.push(`${dbCol} = ?`); vals.push(jsKey === 'tags' ? JSON.stringify(body[jsKey]) : body[jsKey]); }
    }
    vals.push(id);
    await execute(c.env.DB, `UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`, vals);
    const updated = await queryOne(c.env.DB, 'SELECT * FROM tenants WHERE id = ?', [id]);
    if (!updated) return c.json({ success: false, error: 'Client not found' }, 404);
    return c.json({ success: true, data: updated });
});

export default clients;
