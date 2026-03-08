// ============================================================
// Pipeline Routes — D1
// ============================================================
import { Hono } from 'hono';
import type { Env } from '../types';
import { newId, now } from '../types';
import { query, queryOne, execute } from '../db';
import { getUser } from '../middleware/auth';

const pipeline = new Hono<{ Bindings: Env }>();

const STAGES = [
    { id: 'lead', name: 'Lead', order: 1, color: '#6B7280' },
    { id: 'qualification', name: 'Qualificação', order: 2, color: '#3B82F6' },
    { id: 'demo', name: 'Demo', order: 3, color: '#8B5CF6' },
    { id: 'proposal', name: 'Proposta', order: 4, color: '#F59E0B' },
    { id: 'negotiation', name: 'Negociação', order: 5, color: '#EF4444' },
    { id: 'closing', name: 'Fechamento', order: 6, color: '#10B981' },
];

pipeline.get('/api/pipeline', async (c) => {
    const db = c.env.DB;
    // Backfill missing leads
    const missing = await query<any>(db,
        `SELECT l.* FROM leads l WHERE NOT EXISTS (SELECT 1 FROM deals_pipeline d WHERE d.lead_id = l.id)`);
    for (const l of missing) {
        await execute(db,
            `INSERT INTO deals_pipeline (id, lead_id, title, contact_name, contact_phone, contact_email,
             product_of_interest, proposed_value, status, stage, temperature, assigned_to_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 'lead', ?, ?, ?, ?)`,
            [newId(), l.id, l.name ? `Lead - ${l.name}` : `Lead - ${l.phone}`, l.name || 'Sem Nome',
            l.phone, l.email, l.product_of_interest, l.estimated_value, l.temperature, l.assigned_to_id, now(), now()]);
    }

    const deals = await query<any>(db,
        `SELECT d.id, d.title, d.contact_name, d.contact_phone, d.stage, d.temperature,
         d.proposed_value, d.next_step, d.next_step_date, d.status, d.created_at, u.name as assigned_to
         FROM deals_pipeline d LEFT JOIN users u ON d.assigned_to_id = u.id
         WHERE d.status = 'open' ORDER BY d.created_at DESC`);

    return c.json({
        success: true, data: {
            stages: STAGES,
            deals: deals.map(d => ({ ...d, proposedValue: Number(d.proposed_value || 0) })),
        }
    });
});

pipeline.put('/api/pipeline/:id/move', async (c) => {
    const id = c.req.param('id');
    const { stage } = await c.req.json();
    await execute(c.env.DB, 'UPDATE deals_pipeline SET stage = ?, updated_at = ? WHERE id = ?', [stage, now(), id]);
    const updated = await queryOne(c.env.DB, 'SELECT * FROM deals_pipeline WHERE id = ?', [id]);
    if (!updated) return c.json({ success: false, error: 'Deal not found' }, 404);
    return c.json({ success: true, data: updated });
});

pipeline.post('/api/pipeline', async (c) => {
    const body = await c.req.json();
    const user = getUser(c);
    const id = newId(); const ts = now();
    await execute(c.env.DB,
        `INSERT INTO deals_pipeline (id, title, contact_name, contact_phone, product_of_interest,
         proposed_value, temperature, assigned_to_id, next_step, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, body.title, body.contactName, body.contactPhone, body.productOfInterest,
            body.proposedValue, body.temperature || 'cold', body.assignedToId || user?.sub, body.nextStep, ts, ts]);
    const newDeal = await queryOne(c.env.DB, 'SELECT * FROM deals_pipeline WHERE id = ?', [id]);
    return c.json({ success: true, data: newDeal }, 201);
});

pipeline.get('/api/pipeline/by-phone/:phone', async (c) => {
    const phone = decodeURIComponent(c.req.param('phone'));
    const deal = await queryOne(c.env.DB,
        `SELECT id, title, contact_name, contact_phone, stage, temperature, status
         FROM deals_pipeline WHERE contact_phone = ? ORDER BY created_at DESC LIMIT 1`, [phone]);
    return c.json({ success: true, data: deal || null });
});

export default pipeline;
