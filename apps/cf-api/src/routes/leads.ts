// ============================================================
// Leads Routes — D1
// ============================================================
import { Hono } from 'hono';
import type { Env } from '../types';
import { newId, now } from '../types';
import { query, queryOne, execute } from '../db';
import { getUser } from '../middleware/auth';
import { createAuditLog } from './audit';

const leads = new Hono<{ Bindings: Env }>();

const CRITICAL_FIELDS = ['name', 'phone'];

// ─── GET /api/leads ─────────────────────────────────────────
leads.get('/api/leads', async (c) => {
    const url = new URL(c.req.url);
    const temperature = url.searchParams.get('temperature') || '';
    const status = url.searchParams.get('status') || '';
    const cidade = url.searchParams.get('cidade') || '';
    const user = getUser(c);

    let sql = `SELECT l.id, l.name, l.phone, l.email, l.niche, l.cidade, l.temperature, l.source,
        l.product_of_interest, l.estimated_value, l.last_contact_at, l.next_follow_up_at,
        l.snooze_until, l.status, l.current_funnel_stage_id, l.representative_id, l.created_at,
        u.name as assigned_to
        FROM leads l LEFT JOIN users u ON l.assigned_to_id = u.id
        WHERE l.is_converted = 0`;
    const params: unknown[] = [];

    if (user?.role === 'representante') {
        if (!user.representativeId) return c.json({ success: true, data: [] });
        sql += ' AND l.representative_id = ?';
        params.push(user.representativeId);
    }
    if (temperature) { sql += ' AND l.temperature = ?'; params.push(temperature); }
    if (status) { sql += ' AND l.status = ?'; params.push(status); }
    if (cidade) { sql += ' AND l.cidade = ?'; params.push(cidade); }

    sql += ' ORDER BY l.created_at DESC';

    const rows = await query(c.env.DB, sql, params);
    return c.json({ success: true, data: rows });
});

// ─── GET /api/leads/action-summary (MUST be before /:id) ───────
leads.get('/api/leads/action-summary', async (c) => {
    const user = getUser(c);
    const db = c.env.DB;
    const repId = user?.representativeId;
    const repFilter = user?.role === 'representante' && repId ? `AND representative_id = '${repId}'` : '';
    const [hot, followUp, noContact] = await Promise.all([
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE temperature = 'hot' AND is_converted = 0 ${repFilter}`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE next_follow_up_at <= datetime('now') AND is_converted = 0 AND next_follow_up_at IS NOT NULL ${repFilter}`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE last_contact_at IS NULL AND is_converted = 0 ${repFilter}`),
    ]);
    return c.json({ success: true, data: { hot: hot?.c || 0, followUp: followUp?.c || 0, noContact: noContact?.c || 0 } });
});

// ─── GET /api/leads/:id ──────────────────────────────────────────
leads.get('/api/leads/:id', async (c) => {
    const id = c.req.param('id');
    const user = getUser(c);
    const db = c.env.DB;

    let sql = 'SELECT * FROM leads WHERE id = ?';
    const params: unknown[] = [id];

    if (user?.role === 'representante') {
        if (!user.representativeId) return c.json({ success: false, error: 'Access denied' }, 403);
        sql += ' AND representative_id = ?';
        params.push(user.representativeId);
    }

    const lead = await queryOne(db, sql, params);
    if (!lead) return c.json({ success: false, error: 'Lead not found or access denied' }, 404);

    // Fetch related data in parallel
    const [messages, activities, notes, proposals] = await Promise.all([
        query(db, 'SELECT * FROM lead_conversations WHERE lead_id = ? ORDER BY created_at', [id]),
        query(db,
            `SELECT la.id, la.canal, la.resultado, la.observacao, la.contacted_at, la.created_at, u.name as user_name
             FROM lead_activities la LEFT JOIN users u ON la.user_id = u.id
             WHERE la.lead_id = ? ORDER BY la.contacted_at DESC`, [id]),
        query(db,
            `SELECT ln.id, ln.texto, ln.created_at, u.name as user_name
             FROM lead_notes ln LEFT JOIN users u ON ln.user_id = u.id
             WHERE ln.lead_id = ? ORDER BY ln.created_at DESC`, [id]),
        query(db,
            `SELECT id, tipo, arquivo_pdf_url, url, status_proposta, observacao_admin, created_at
             FROM lead_proposals WHERE lead_id = ? ORDER BY created_at DESC`, [id]),
    ]);

    return c.json({
        success: true,
        data: { ...lead, messages, activities, notes, proposals },
    });
});

// ─── POST /api/leads ────────────────────────────────────────
leads.post('/api/leads', async (c) => {
    const body = await c.req.json();
    const user = getUser(c);
    const db = c.env.DB;

    let repId = body.representativeId;
    if (user?.role === 'representante') {
        if (!user.representativeId) return c.json({ success: false, error: 'Rep missing' }, 403);
        repId = user.representativeId;
    }

    const leadId = newId();
    const ts = now();
    // Handle unique phone constraint gracefully
    try {
        await execute(db,
            `INSERT INTO leads (id, name, phone, email, niche, cidade, observacao_inicial, temperature, source,
             product_of_interest, estimated_value, assigned_to_id, representative_id, current_funnel_stage_id,
             status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [leadId, body.name ?? null, body.phone ?? null, body.email ?? null, body.niche ?? null, body.cidade ?? null,
                body.observacaoInicial ?? null, body.temperature ?? 'cold', body.source ?? 'whatsapp_direct',
                body.productOfInterest ?? null, body.estimatedValue ?? null, body.assignedToId ?? user?.sub ?? null,
                repId ?? null, body.currentFunnelStageId ?? null, 'ativo', ts, ts]
        );
    } catch (e: any) {
        if (e?.message?.includes('UNIQUE')) {
            return c.json({ success: false, error: 'Lead com este telefone já existe' }, 409);
        }
        throw e;
    }

    const newLead = await queryOne(db, 'SELECT * FROM leads WHERE id = ?', [leadId]);

    await createAuditLog(db, {
        userId: user.sub, action: 'CREATE_LEAD', entityType: 'lead', entityId: leadId,
    });

    // Auto-create deal in pipeline (ignore errors — not critical)
    try {
        const dealId = newId();
        await execute(db,
            `INSERT INTO deals_pipeline (id, lead_id, title, contact_name, contact_phone, contact_email,
             product_of_interest, proposed_value, status, stage, temperature, assigned_to_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [dealId, leadId, body.name ? `Lead - ${body.name}` : `Lead - ${body.phone ?? 'Sem Telefone'}`,
                body.name || 'Sem Nome', body.phone ?? null, body.email ?? null, body.productOfInterest ?? null,
                body.estimatedValue ?? null, 'open', 'lead', body.temperature || 'cold',
                body.assignedToId ?? user?.sub ?? null, ts, ts]
        );
    } catch { /* non-critical */ }

    return c.json({ success: true, data: newLead }, 201);
});

// ─── PUT /api/leads/:id ─────────────────────────────────────
leads.put('/api/leads/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const user = getUser(c);
    const db = c.env.DB;

    let selectSql = 'SELECT * FROM leads WHERE id = ?';
    const selectParams: unknown[] = [id];
    if (user?.role === 'representante') {
        if (!user.representativeId) return c.json({ success: false, error: 'Access denied' }, 403);
        selectSql += ' AND representative_id = ?';
        selectParams.push(user.representativeId);
    }

    const existing = await queryOne<any>(db, selectSql, selectParams);
    if (!existing) return c.json({ success: false, error: 'Lead not found or access denied' }, 404);

    // Critical field check for representante
    if (user?.role === 'representante') {
        for (const field of CRITICAL_FIELDS) {
            if (body[field] !== undefined && body[field] !== existing[field]) {
                if (!body.justification) {
                    return c.json({ success: false, error: `Justificativa obrigatória ao alterar campo crítico: ${field}` }, 400);
                }
                await createAuditLog(db, {
                    userId: user.sub, action: 'EDIT_CRITICAL_FIELD', entityType: 'lead',
                    entityId: id, fieldName: field,
                    oldValue: String(existing[field] || ''), newValue: String(body[field]),
                    justification: body.justification,
                });
            }
        }
    }

    if (body.status === 'perdido' && !body.motivoPerdaTexto) {
        return c.json({ success: false, error: 'motivo_perda is required when marking lead as perdido' }, 400);
    }

    // Build update dynamically
    const { justification, ...updateData } = body;
    const fieldMap: Record<string, string> = {
        name: 'name', phone: 'phone', email: 'email', niche: 'niche', cidade: 'cidade',
        temperature: 'temperature', source: 'source', status: 'status',
        productOfInterest: 'product_of_interest', estimatedValue: 'estimated_value',
        assignedToId: 'assigned_to_id', representativeId: 'representative_id',
        currentFunnelStageId: 'current_funnel_stage_id', snoozeUntil: 'snooze_until',
        snoozeMotivo: 'snooze_motivo', nextFollowUpAt: 'next_follow_up_at',
        motivoPerdaTexto: 'motivo_perda_texto', lossReason: 'loss_reason',
        observacaoInicial: 'observacao_inicial', metadata: 'metadata',
    };

    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [now()];

    for (const [jsKey, dbCol] of Object.entries(fieldMap)) {
        if (updateData[jsKey] !== undefined) {
            sets.push(`${dbCol} = ?`);
            vals.push(jsKey === 'metadata' ? JSON.stringify(updateData[jsKey]) : updateData[jsKey]);
        }
    }

    vals.push(id);
    await execute(db, `UPDATE leads SET ${sets.join(', ')} WHERE id = ?`, vals);

    if (body.status && body.status !== existing.status) {
        await createAuditLog(db, {
            userId: user.sub, action: 'CHANGE_STATUS', entityType: 'lead', entityId: id,
            fieldName: 'status', oldValue: existing.status, newValue: body.status,
        });
    }
    if (body.temperature && body.temperature !== existing.temperature) {
        await createAuditLog(db, {
            userId: user.sub, action: 'CHANGE_TEMPERATURE', entityType: 'lead', entityId: id,
            fieldName: 'temperature', oldValue: existing.temperature, newValue: body.temperature,
        });
    }

    const updated = await queryOne(db, 'SELECT * FROM leads WHERE id = ?', [id]);
    return c.json({ success: true, data: updated });
});

// ─── PUT /api/leads/:id/snooze ──────────────────────────────
leads.put('/api/leads/:id/snooze', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const user = getUser(c);
    const db = c.env.DB;

    if (!body.snoozeUntil || !body.snoozeMotivo) {
        return c.json({ success: false, error: 'snoozeUntil and snoozeMotivo are required' }, 400);
    }

    await execute(db, 'UPDATE leads SET snooze_until = ?, snooze_motivo = ?, updated_at = ? WHERE id = ?',
        [body.snoozeUntil, body.snoozeMotivo, now(), id]);

    await createAuditLog(db, {
        userId: user.sub, action: 'SNOOZE_FOLLOWUP', entityType: 'lead', entityId: id,
        newValue: body.snoozeUntil, justification: body.snoozeMotivo,
    });

    const updated = await queryOne(db, 'SELECT * FROM leads WHERE id = ?', [id]);
    return c.json({ success: true, data: updated });
});

// ─── PUT /api/leads/:id/follow-up ───────────────────────────
leads.put('/api/leads/:id/follow-up', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    if (!body.nextFollowUpAt) {
        return c.json({ success: false, error: 'nextFollowUpAt is required' }, 400);
    }

    await execute(c.env.DB, 'UPDATE leads SET next_follow_up_at = ?, updated_at = ? WHERE id = ?',
        [body.nextFollowUpAt, now(), id]);

    const updated = await queryOne(c.env.DB, 'SELECT * FROM leads WHERE id = ?', [id]);
    return c.json({ success: true, data: updated });
});

export default leads;
