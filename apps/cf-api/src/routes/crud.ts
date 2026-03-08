// ============================================================
// Remaining CRUD Routes — D1 (Bulk file for simpler routes)
// Covers: tickets, finance, team, mentorship, documents,
//         campaigns, systems, ideas, wiki, onboarding, reports,
//         config, health, lead-activities, lead-notes,
//         lead-proposals, proposal-adjustments, delete-requests,
//         city-presentations, lead-stats, projects, prospect,
//         bot
// ============================================================
import { Hono } from 'hono';
import type { Env } from '../types';
import { newId, now } from '../types';
import { query, queryOne, execute } from '../db';
import { getUser } from '../middleware/auth';
import { createAuditLog } from './audit';

const crud = new Hono<{ Bindings: Env }>();

// ─── Support Tickets ────────────────────────────────────────
crud.get('/api/tickets', async (c) => {
    const rows = await query(c.env.DB,
        `SELECT t.*, u.name as assigned_to_name FROM support_tickets t LEFT JOIN users u ON t.assigned_to_id = u.id ORDER BY t.created_at DESC`);
    return c.json({ success: true, data: rows });
});
crud.get('/api/tickets/:id', async (c) => {
    const t = await queryOne(c.env.DB, 'SELECT * FROM support_tickets WHERE id = ?', [c.req.param('id')]);
    if (!t) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({ success: true, data: t });
});
crud.post('/api/tickets', async (c) => {
    const body = await c.req.json(); const user = getUser(c); const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO support_tickets (id, tenant_id, title, description, priority, status, assigned_to_id, created_by_user_id, system_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)`,
        [id, body.tenantId, body.title, body.description, body.priority || 'medium', body.assignedToId, user.sub, body.systemType, ts, ts]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM support_tickets WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});
crud.put('/api/tickets/:id', async (c) => {
    const id = c.req.param('id'); const body = await c.req.json();
    const sets: string[] = ['updated_at = ?']; const vals: unknown[] = [now()];
    const map: Record<string, string> = { status: 'status', priority: 'priority', assignedToId: 'assigned_to_id' };
    for (const [k, col] of Object.entries(map)) { if (body[k] !== undefined) { sets.push(`${col} = ?`); vals.push(body[k]); } }
    if (body.status === 'resolved') { sets.push('resolved_at = ?'); vals.push(now()); }
    vals.push(id);
    await execute(c.env.DB, `UPDATE support_tickets SET ${sets.join(', ')} WHERE id = ?`, vals);
    const row = await queryOne(c.env.DB, 'SELECT * FROM support_tickets WHERE id = ?', [id]);
    return c.json({ success: true, data: row });
});

// ─── Finance (Payments + Commissions + Costs) ───────────────
crud.get('/api/finance/overview', async (c) => {
    const db = c.env.DB;
    const ms = new Date(); ms.setDate(1); ms.setHours(0, 0, 0, 0); const monthStart = ms.toISOString();
    const [rev, costs, commissions] = await Promise.all([
        queryOne<any>(db, `SELECT SUM(amount) as total FROM payments WHERE is_paid = 1 AND created_at >= ?`, [monthStart]),
        queryOne<any>(db, `SELECT SUM(amount) as total FROM operational_costs WHERE is_recurring = 1`),
        queryOne<any>(db, `SELECT SUM(amount) as total FROM commissions WHERE is_paid = 0`),
    ]);
    return c.json({ success: true, data: { revenue: Number(rev?.total || 0), costs: Number(costs?.total || 0), pendingCommissions: Number(commissions?.total || 0) } });
});
crud.get('/api/finance/payments', async (c) => {
    const rows = await query(c.env.DB, `SELECT p.*, t.name as tenant_name FROM payments p LEFT JOIN tenants t ON p.tenant_id = t.id ORDER BY p.due_date DESC`);
    return c.json({ success: true, data: rows });
});
crud.get('/api/finance/commissions', async (c) => {
    const rows = await query(c.env.DB, `SELECT c.*, u.name as user_name FROM commissions c LEFT JOIN users u ON c.user_id = u.id ORDER BY c.created_at DESC`);
    return c.json({ success: true, data: rows });
});

// ─── Team ───────────────────────────────────────────────────
crud.get('/api/team', async (c) => {
    const rows = await query(c.env.DB,
        `SELECT tm.*, u.name, u.email, u.role, u.avatar_url FROM team_members tm INNER JOIN users u ON tm.user_id = u.id ORDER BY u.name`);
    return c.json({ success: true, data: rows });
});

// ─── Mentorship Tasks ───────────────────────────────────────
crud.get('/api/mentorship/tasks', async (c) => {
    const rows = await query(c.env.DB, 'SELECT * FROM mentorship_tasks ORDER BY created_at DESC');
    return c.json({ success: true, data: rows });
});
crud.post('/api/mentorship/tasks', async (c) => {
    const body = await c.req.json(); const user = getUser(c); const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO mentorship_tasks (id, tenant_id, title, description, priority, status, created_by_user_id, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [id, body.tenantId, body.title, body.description, body.priority || 'normal', user.sub, body.dueDate, ts, ts]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM mentorship_tasks WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});
crud.put('/api/mentorship/tasks/:id', async (c) => {
    const id = c.req.param('id'); const body = await c.req.json();
    const sets: string[] = ['updated_at = ?']; const vals: unknown[] = [now()];
    if (body.status) { sets.push('status = ?'); vals.push(body.status); }
    if (body.title) { sets.push('title = ?'); vals.push(body.title); }
    if (body.status === 'completed') { sets.push('completed_at = ?'); vals.push(now()); }
    vals.push(id);
    await execute(c.env.DB, `UPDATE mentorship_tasks SET ${sets.join(', ')} WHERE id = ?`, vals);
    const row = await queryOne(c.env.DB, 'SELECT * FROM mentorship_tasks WHERE id = ?', [id]);
    return c.json({ success: true, data: row });
});

// ─── Documents ──────────────────────────────────────────────
crud.get('/api/documents', async (c) => {
    const rows = await query(c.env.DB, 'SELECT d.*, u.name as uploader FROM documents d LEFT JOIN users u ON d.uploaded_by_user_id = u.id ORDER BY d.created_at DESC');
    return c.json({ success: true, data: rows });
});

// ─── Ideas ──────────────────────────────────────────────────
crud.get('/api/ideas', async (c) => {
    const rows = await query(c.env.DB, 'SELECT i.*, u.name as submitted_by FROM ideas i LEFT JOIN users u ON i.submitted_by_user_id = u.id ORDER BY i.upvotes DESC');
    return c.json({ success: true, data: rows });
});
crud.post('/api/ideas', async (c) => {
    const body = await c.req.json(); const user = getUser(c); const id = newId(); const ts = now();
    await execute(c.env.DB, `INSERT INTO ideas (id, title, description, submitted_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, body.title, body.description, user.sub, ts, ts]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM ideas WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});
crud.post('/api/ideas/:id/upvote', async (c) => {
    const id = c.req.param('id');
    await execute(c.env.DB, 'UPDATE ideas SET upvotes = upvotes + 1 WHERE id = ?', [id]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM ideas WHERE id = ?', [id]);
    return c.json({ success: true, data: row });
});

// ─── Wiki ───────────────────────────────────────────────────
crud.get('/api/wiki', async (c) => {
    const rows = await query(c.env.DB, `SELECT * FROM wiki_articles WHERE is_published = 1 ORDER BY updated_at DESC`);
    return c.json({ success: true, data: rows });
});
crud.get('/api/wiki/:slug', async (c) => {
    const row = await queryOne(c.env.DB, 'SELECT * FROM wiki_articles WHERE slug = ?', [c.req.param('slug')]);
    if (!row) return c.json({ success: false, error: 'Not found' }, 404);
    return c.json({ success: true, data: row });
});

// ─── Config ─────────────────────────────────────────────────
crud.get('/api/config/funnel-stages', async (c) => {
    const rows = await query(c.env.DB, 'SELECT * FROM funnel_stages ORDER BY "order" ASC');
    return c.json({ success: true, data: rows });
});
crud.get('/api/config/system-templates', async (c) => {
    const rows = await query(c.env.DB, `SELECT * FROM system_templates WHERE is_active = 1`);
    return c.json({ success: true, data: rows });
});

// ─── Lead Activities ────────────────────────────────────────
crud.post('/api/leads/:leadId/activities', async (c) => {
    const leadId = c.req.param('leadId'); const body = await c.req.json(); const user = getUser(c);
    const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO lead_activities (id, lead_id, user_id, canal, resultado, observacao, contacted_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, leadId, user.sub, body.canal, body.resultado, body.observacao, body.contactedAt || ts, ts]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM lead_activities WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});

// ─── Lead Notes ─────────────────────────────────────────────
crud.post('/api/leads/:leadId/notes', async (c) => {
    const leadId = c.req.param('leadId'); const body = await c.req.json(); const user = getUser(c);
    const id = newId();
    await execute(c.env.DB, `INSERT INTO lead_notes (id, lead_id, user_id, texto, created_at) VALUES (?, ?, ?, ?, ?)`,
        [id, leadId, user.sub, body.texto, now()]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM lead_notes WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});

// ─── Lead Proposals ─────────────────────────────────────────
crud.post('/api/leads/:leadId/proposals', async (c) => {
    const leadId = c.req.param('leadId'); const body = await c.req.json(); const user = getUser(c);
    const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO lead_proposals (id, lead_id, created_by_admin_id, tipo, arquivo_pdf_url, url, status_proposta, observacao_admin, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, leadId, user.sub, body.tipo, body.arquivoPdfUrl, body.url, body.statusProposta || 'enviada', body.observacaoAdmin, ts, ts]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM lead_proposals WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});

// ─── Proposal Adjustments ───────────────────────────────────
crud.get('/api/proposal-adjustments', async (c) => {
    const rows = await query(c.env.DB,
        `SELECT p.*, l.name as lead_name, u.name as rep_name FROM proposal_adjustment_requests p
         LEFT JOIN leads l ON p.lead_id = l.id LEFT JOIN users u ON p.representante_id = u.id ORDER BY p.created_at DESC`);
    return c.json({ success: true, data: rows });
});
crud.post('/api/proposal-adjustments', async (c) => {
    const body = await c.req.json(); const user = getUser(c); const id = newId();
    await execute(c.env.DB,
        `INSERT INTO proposal_adjustment_requests (id, lead_id, representante_id, mensagem, status, created_at) VALUES (?, ?, ?, ?, 'pendente', ?)`,
        [id, body.leadId, user.representativeId || user.sub, body.mensagem, now()]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM proposal_adjustment_requests WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});
crud.put('/api/proposal-adjustments/:id', async (c) => {
    const id = c.req.param('id'); const body = await c.req.json(); const user = getUser(c);
    await execute(c.env.DB,
        `UPDATE proposal_adjustment_requests SET status = ?, admin_response = ?, responded_at = ?, responded_by_admin_id = ? WHERE id = ?`,
        [body.status, body.adminResponse, now(), user.sub, id]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM proposal_adjustment_requests WHERE id = ?', [id]);
    return c.json({ success: true, data: row });
});

// ─── Delete Requests ────────────────────────────────────────
crud.get('/api/delete-requests', async (c) => {
    const rows = await query(c.env.DB,
        `SELECT d.*, l.name as lead_name, u.name as rep_name FROM delete_requests d
         LEFT JOIN leads l ON d.lead_id = l.id LEFT JOIN users u ON d.representante_id = u.id ORDER BY d.created_at DESC`);
    return c.json({ success: true, data: rows });
});
crud.post('/api/delete-requests', async (c) => {
    const body = await c.req.json(); const user = getUser(c); const id = newId();
    await execute(c.env.DB,
        `INSERT INTO delete_requests (id, lead_id, representante_id, motivo, status, created_at) VALUES (?, ?, ?, ?, 'pendente', ?)`,
        [id, body.leadId, user.representativeId || user.sub, body.motivo, now()]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM delete_requests WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});

// ─── City Presentations ─────────────────────────────────────
crud.get('/api/city-presentations', async (c) => {
    const rows = await query(c.env.DB, `SELECT * FROM city_presentations WHERE ativo = 1 ORDER BY cidade`);
    return c.json({ success: true, data: rows });
});
crud.post('/api/city-presentations', async (c) => {
    const body = await c.req.json(); const user = getUser(c); const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO city_presentations (id, cidade, link, ativo, updated_by_admin_id, updated_at, created_at) VALUES (?, ?, ?, 1, ?, ?, ?)`,
        [id, body.cidade, body.link, user.sub, ts, ts]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM city_presentations WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});

// ─── Projects ───────────────────────────────────────────────
crud.get('/api/projects', async (c) => {
    const rows = await query(c.env.DB,
        `SELECT p.*, l.name as lead_name, l.phone as lead_phone FROM projects p LEFT JOIN leads l ON p.lead_id = l.id ORDER BY p.created_at DESC`);
    return c.json({ success: true, data: rows });
});
crud.post('/api/projects', async (c) => {
    const body = await c.req.json(); const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO projects (id, lead_id, total_value, entry_value, installments_count, installment_value, status, representative_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, body.leadId, body.totalValue, body.entryValue, body.installmentsCount, body.installmentValue, body.status || 'negociacao', body.representativeId, ts, ts]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM projects WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});

// ─── Bot ────────────────────────────────────────────────────
crud.get('/api/bot/sessions', async (c) => {
    const rows = await query(c.env.DB, 'SELECT * FROM bot_sessions ORDER BY created_at DESC');
    return c.json({ success: true, data: rows });
});
crud.get('/api/bot/status', async (c) => {
    const session = await queryOne<any>(c.env.DB, `SELECT * FROM bot_sessions ORDER BY created_at DESC LIMIT 1`);
    return c.json({ success: true, data: { status: session?.status || 'disconnected', phoneNumber: session?.phone_number, session } });
});
crud.get('/api/bot/conversations', async (c) => {
    // Returns recent leads with last conversation message (simulates inbox)
    const rows = await query<any>(c.env.DB,
        `SELECT l.id, l.name, l.phone, l.temperature, l.last_contact_at,
                (SELECT content FROM lead_conversations WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT COUNT(*) FROM lead_conversations WHERE lead_id = l.id AND is_read = 0) as unread_count
         FROM leads l ORDER BY l.last_contact_at DESC NULLS LAST LIMIT 50`);
    return c.json({ success: true, data: rows });
});
crud.get('/api/bot/conversations/:leadId/messages', async (c) => {
    const rows = await query(c.env.DB,
        'SELECT * FROM lead_conversations WHERE lead_id = ? ORDER BY created_at ASC',
        [c.req.param('leadId')]);
    // Mark as read
    await execute(c.env.DB, 'UPDATE lead_conversations SET is_read = 1 WHERE lead_id = ?', [c.req.param('leadId')]);
    return c.json({ success: true, data: rows });
});
crud.post('/api/bot/conversations/:leadId/send', async (c) => {
    const body = await c.req.json(); const leadId = c.req.param('leadId'); const ts = now();
    // Store in DB
    const id = newId();
    await execute(c.env.DB,
        `INSERT INTO lead_conversations (id, lead_id, direction, sender_type, message_type, content, is_read, created_at) VALUES (?, ?, 'outbound', 'user', 'text', ?, 1, ?)`,
        [id, leadId, body.message, ts]);
    // Try to send via WA gateway
    try {
        const lead = await queryOne<any>(c.env.DB, 'SELECT phone FROM leads WHERE id = ?', [leadId]);
        if (lead?.phone) {
            await fetch(`${c.env.WHATSAPP_GW_URL}/send`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: lead.phone, message: body.message }),
            });
        }
    } catch { /* gateway offline — message already stored in DB */ }
    return c.json({ success: true });
});

// ─── Prospect Campaigns ─────────────────────────────────────
crud.get('/api/prospect/campaigns', async (c) => {
    const rows = await query(c.env.DB, 'SELECT * FROM prospect_campaigns ORDER BY created_at DESC');
    return c.json({ success: true, data: rows });
});
crud.post('/api/prospect/campaigns', async (c) => {
    const body = await c.req.json(); const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO prospect_campaigns (id, tenant_id, name, channel_type, status, playbook_base_prompt, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 'whatsapp', 'pending', ?, 1, ?, ?)`,
        [id, body.tenantId || 'default', body.name, body.playbookBasePrompt || '', ts, ts]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM prospect_campaigns WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});

// ─── Prospect Contacts (for leadsApi.list) ───────────────────
crud.get('/api/prospect/contacts', async (c) => {
    const rows = await query(c.env.DB, 'SELECT * FROM prospect_contacts ORDER BY created_at DESC');
    return c.json({ success: true, data: rows });
});
crud.delete('/api/prospect/contacts/:id', async (c) => {
    await execute(c.env.DB, 'DELETE FROM prospect_contacts WHERE id = ?', [c.req.param('id')]);
    return c.json({ success: true });
});

// ─── Prospect Queue ──────────────────────────────────────────
crud.get('/api/prospect/queue/status', async (c) => {
    const db = c.env.DB;
    const [pending, active, processed, failed] = await Promise.all([
        queryOne<any>(db, `SELECT COUNT(*) as c FROM prospect_queues WHERE status = 'pending'`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM prospect_queues WHERE status = 'active'`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM prospect_queues WHERE status = 'done'`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM prospect_queues WHERE status = 'failed'`),
    ]);
    return c.json({
        success: true,
        data: {
            isRunning: false, // Workers don't have persistent background processes
            stats: {
                pending: pending?.c || 0,
                active: active?.c || 0,
                processed: processed?.c || 0,
                failed: failed?.c || 0,
            }
        }
    });
});
crud.get('/api/prospect/queue', async (c) => {
    const url = new URL(c.req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const rows = await query(c.env.DB,
        `SELECT pq.*, pc.name as contact_name FROM prospect_queues pq
         LEFT JOIN prospect_contacts pc ON pq.contact_id = pc.id
         ORDER BY pq.created_at DESC LIMIT ?`, [limit]);
    return c.json({ success: true, data: rows });
});
crud.post('/api/prospect/queue/enqueue', async (c) => {
    const body = await c.req.json();
    const { contactIds, campaignId } = body;
    if (!contactIds?.length) return c.json({ success: false, error: 'contactIds required' }, 400);
    const ts = now();
    for (const contactId of contactIds) {
        const id = newId();
        await execute(c.env.DB,
            `INSERT OR IGNORE INTO prospect_queues (id, tenant_id, campaign_id, contact_id, status, created_at)
             VALUES (?, 'default', ?, ?, 'pending', ?)`,
            [id, campaignId, contactId, ts]);
    }
    return c.json({ success: true, data: { enqueued: contactIds.length } });
});
crud.post('/api/prospect/queue/start', async (c) => {
    return c.json({ success: true, data: { isRunning: true, message: 'Queue processing is handled by the WhatsApp gateway service' } });
});
crud.post('/api/prospect/queue/stop', async (c) => {
    return c.json({ success: true, data: { isRunning: false } });
});

// ─── Lead Stats ─────────────────────────────────────────────
crud.get('/api/lead-stats', async (c) => {
    const db = c.env.DB;
    const [total, hot, warm, cold] = await Promise.all([
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE is_converted = 0`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE temperature = 'hot' AND is_converted = 0`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE temperature = 'warm' AND is_converted = 0`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE temperature = 'cold' AND is_converted = 0`),
    ]);
    return c.json({ success: true, data: { total: total?.c || 0, hot: hot?.c || 0, warm: warm?.c || 0, cold: cold?.c || 0 } });
});

// ─── Health ─────────────────────────────────────────────────
crud.get('/api/health', async (c) => c.json({ status: 'ok', timestamp: new Date().toISOString(), runtime: 'cloudflare-workers' }));

// ─── Onboarding ─────────────────────────────────────────────
crud.get('/api/onboarding', async (c) => {
    const rows = await query(c.env.DB, `SELECT o.*, t.name as tenant_name FROM onboarding_processes o LEFT JOIN tenants t ON o.tenant_id = t.id ORDER BY o.created_at DESC`);
    return c.json({ success: true, data: rows });
});

// ─── Reports ────────────────────────────────────────────────
const reportsHandler = async (c: any) => {
    const db = c.env.DB;
    const [clients, leads, deals, revenue] = await Promise.all([
        queryOne<any>(db, 'SELECT COUNT(*) as c FROM tenants WHERE is_active = 1'),
        queryOne<any>(db, 'SELECT COUNT(*) as c FROM leads WHERE is_converted = 0'),
        queryOne<any>(db, `SELECT COUNT(*) as c, SUM(proposed_value) as v FROM deals_pipeline WHERE status = 'open'`),
        queryOne<any>(db, `SELECT SUM(amount) as total FROM payments WHERE is_paid = 1`),
    ]);
    return c.json({
        success: true, data: {
            activeClients: clients?.c || 0, activeLeads: leads?.c || 0,
            openDeals: deals?.c || 0, pipelineValue: Number(deals?.v || 0),
            totalRevenue: Number(revenue?.total || 0),
        }
    });
};
crud.get('/api/reports', reportsHandler);
crud.get('/api/reports/summary', reportsHandler);

// ─── Campaigns ──────────────────────────────────────────────
crud.get('/api/campaigns', async (c) => {
    const rows = await query(c.env.DB, 'SELECT * FROM internal_campaigns ORDER BY created_at DESC');
    return c.json({ success: true, data: rows });
});

// ─── Systems (Templates) ───────────────────────────────────
crud.get('/api/systems', async (c) => {
    const rows = await query(c.env.DB, `SELECT * FROM system_templates WHERE is_active = 1`);
    return c.json({ success: true, data: rows });
});

// ─── Admin: Reassign Lead ────────────────────────────────────
crud.put('/api/admin/leads/:id/reassign', async (c) => {
    const id = c.req.param('id'); const body = await c.req.json();
    await execute(c.env.DB, 'UPDATE leads SET assigned_to_id = ?, updated_at = ? WHERE id = ?', [body.newOwnerId, now(), id]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM leads WHERE id = ?', [id]);
    return c.json({ success: true, data: row });
});

// ─── Delete Requests: Approve/Reject ────────────────────────
crud.put('/api/delete-requests/:id', async (c) => {
    const id = c.req.param('id'); const body = await c.req.json(); const user = getUser(c);
    await execute(c.env.DB,
        'UPDATE delete_requests SET status = ?, decided_at = ?, decided_by_admin_id = ?, admin_motivo = ? WHERE id = ?',
        [body.status, now(), user.sub, body.adminMotivo, id]);
    // If approved, delete the lead
    if (body.status === 'aprovado') {
        const req = await queryOne<any>(c.env.DB, 'SELECT lead_id FROM delete_requests WHERE id = ?', [id]);
        if (req) await execute(c.env.DB, 'UPDATE leads SET status = ? WHERE id = ?', ['deletado', req.lead_id]);
    }
    const row = await queryOne(c.env.DB, 'SELECT * FROM delete_requests WHERE id = ?', [id]);
    return c.json({ success: true, data: row });
});

// ─── Mentorship Aliases ──────────────────────────────────────
crud.get('/api/mentorship/missions', async (c) => {
    const rows = await query(c.env.DB, 'SELECT * FROM mentorship_tasks ORDER BY created_at DESC');
    return c.json({ success: true, data: rows });
});
crud.post('/api/mentorship/missions', async (c) => {
    const body = await c.req.json(); const user = getUser(c); const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO mentorship_tasks (id, tenant_id, title, description, priority, status, created_by_user_id, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [id, body.tenantId, body.title, body.description, body.priority || 'normal', user.sub, body.dueDate, ts, ts]);
    const row = await queryOne(c.env.DB, 'SELECT * FROM mentorship_tasks WHERE id = ?', [id]);
    return c.json({ success: true, data: row }, 201);
});
crud.get('/api/mentorship/playbooks', async (c) => {
    const rows = await query(c.env.DB, `SELECT * FROM playbooks WHERE is_active = 1 ORDER BY created_at DESC`);
    return c.json({ success: true, data: rows });
});
crud.get('/api/mentorship/money-on-table', async (c) => {
    const rows = await query(c.env.DB, 'SELECT * FROM money_on_table_snapshots ORDER BY calculated_at DESC LIMIT 10');
    return c.json({ success: true, data: rows });
});

// ─── Leads: action-summary (for rep portal Team page) ───────
crud.get('/api/leads/action-summary', async (c) => {
    const user = getUser(c);
    const db = c.env.DB;
    const repFilter = user.role === 'representante' ? `AND representative_id = '${user.representativeId}'` : '';
    const [hot, followUp, noContact] = await Promise.all([
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE temperature = 'hot' AND is_converted = 0 ${repFilter}`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE next_follow_up_at <= datetime('now') AND is_converted = 0 ${repFilter}`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE last_contact_at IS NULL AND is_converted = 0 ${repFilter}`),
    ]);
    return c.json({ success: true, data: { hot: hot?.c || 0, followUp: followUp?.c || 0, noContact: noContact?.c || 0 } });
});

// ─── Onboarding: client self-submit ─────────────────────────
crud.post('/api/onboarding/client-submit', async (c) => {
    const body = await c.req.json(); const user = getUser(c);
    // Store onboarding form data in the tenant metadata
    const tenant = await queryOne<any>(c.env.DB, 'SELECT * FROM tenants WHERE id = ?', [user.tenantId]);
    if (!tenant) return c.json({ success: false, error: 'Tenant not found' }, 404);
    const meta = JSON.parse(tenant.metadata || '{}');
    meta.onboarding = { ...meta.onboarding, ...body, submittedAt: now() };
    await execute(c.env.DB, 'UPDATE tenants SET metadata = ?, updated_at = ? WHERE id = ?',
        [JSON.stringify(meta), now(), user.tenantId]);
    return c.json({ success: true, message: 'Onboarding data submitted successfully' });
});

export default crud;
