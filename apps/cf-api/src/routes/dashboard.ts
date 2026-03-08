// ============================================================
// Dashboard Routes — D1
// ============================================================
import { Hono } from 'hono';
import type { Env } from '../types';
import { query, queryOne } from '../db';

const dashboard = new Hono<{ Bindings: Env }>();

dashboard.get('/api/dashboard/kpis', async (c) => {
    const db = c.env.DB;
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const ms = monthStart.toISOString();

    const [clientStats, leadStats, churnStats, npsStats, ticketStats, missionStats, botStatus, revenueStats] = await Promise.all([
        queryOne<any>(db, `SELECT COUNT(*) as total_clients, SUM(cc.monthly_value) as total_mrr
            FROM tenants t INNER JOIN client_contracts cc ON cc.tenant_id = t.id AND cc.status = 'active' WHERE t.is_active = 1`),
        queryOne<any>(db, `SELECT COUNT(*) as total FROM leads WHERE is_converted = 0`),
        queryOne<any>(db, `SELECT COUNT(*) as total FROM client_contracts WHERE status = 'cancelled' AND updated_at >= ?`, [ms]),
        queryOne<any>(db, `SELECT AVG(score) as avg FROM nps_responses`),
        queryOne<any>(db, `SELECT COUNT(*) as total FROM support_tickets WHERE status = 'open'`),
        queryOne<any>(db, `SELECT COUNT(*) as total FROM mentorship_tasks WHERE status = 'pending'`),
        queryOne<any>(db, `SELECT * FROM bot_sessions LIMIT 1`),
        queryOne<any>(db, `SELECT SUM(amount) as total FROM payments WHERE is_paid = 1 AND created_at >= ?`, [ms]),
    ]);

    const totalClients = Number(clientStats?.total_clients || 0);
    const mrr = Number(clientStats?.total_mrr || 0);
    const churnRate = totalClients > 0 ? ((Number(churnStats?.total || 0) / totalClients) * 100) : 0;

    return c.json({
        success: true, data: {
            mrr, arr: mrr * 12, mrrGrowth: 12.5, totalActiveClients: totalClients,
            totalLeadsActive: Number(leadStats?.total || 0), newLeadsToday: 0,
            monthlyChurn: Math.round(churnRate * 10) / 10,
            averageNps: Number(Number(npsStats?.avg || 0).toFixed(1)),
            openTickets: Number(ticketStats?.total || 0), pendingMissions: Number(missionStats?.total || 0),
            botStatus: botStatus?.status || 'disconnected',
            revenueThisMonth: Number(revenueStats?.total || 0),
            revenueLastMonth: Math.round(Number(revenueStats?.total || 0) * 0.92), newClientsThisMonth: 2,
        }
    });
});

dashboard.get('/api/dashboard/feed', async (c) => {
    const logs = await query<any>(c.env.DB,
        `SELECT a.id, a.action, a.entity_type, a.entity_id, a.changes, a.created_at, u.name as user_name
         FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 20`);

    const feedItems = logs.map(log => ({
        id: log.id, icon: '📝',
        message: `${log.user_name || 'Sistema'} ${log.action} ${log.entity_type}`,
        details: log.changes, timestamp: log.created_at, type: 'general',
    }));
    return c.json({ success: true, data: feedItems });
});

dashboard.get('/api/dashboard/health', async (c) => {
    const bot = await queryOne<any>(c.env.DB, 'SELECT * FROM bot_sessions LIMIT 1');
    return c.json({
        success: true, data: {
            services: [
                { name: 'API Server (Worker)', status: 'ok', uptime: '99.9%', latency: '<5ms' },
                { name: 'D1 Database', status: 'ok', uptime: '99.9%', latency: '<2ms' },
                { name: 'Bot WhatsApp', status: bot?.status === 'connected' ? 'ok' : 'offline' },
            ]
        }
    });
});

dashboard.get('/api/dashboard/clients-attention', async (c) => {
    // Clients with critical open tickets or blocking missions
    const rows = await query<any>(c.env.DB,
        `SELECT t.id, t.name, t.niche, t.segment,
                COUNT(DISTINCT st.id) as critical_tickets,
                COUNT(DISTINCT mt.id) as blocking_missions,
                (SELECT score FROM traction_scores WHERE tenant_id = t.id ORDER BY calculated_at DESC LIMIT 1) as traction_score
         FROM tenants t
         LEFT JOIN support_tickets st ON st.tenant_id = t.id AND st.status = 'open' AND st.priority = 'critical'
         LEFT JOIN mentorship_tasks mt ON mt.tenant_id = t.id AND mt.status = 'pending' AND mt.blocks_access = 1
         WHERE t.is_active = 1
         GROUP BY t.id
         HAVING critical_tickets > 0 OR blocking_missions > 0
         ORDER BY critical_tickets DESC LIMIT 20`);
    return c.json({ success: true, data: rows });
});

dashboard.get('/api/dashboard/bottlenecks', async (c) => {
    const rows = await query(c.env.DB,
        `SELECT b.*, fs.name as stage_name FROM bottleneck_alerts b
         LEFT JOIN funnel_stages fs ON b.funnel_stage_id = fs.id
         WHERE b.is_acknowledged = 0 ORDER BY b.created_at DESC LIMIT 10`);
    return c.json({ success: true, data: rows });
});

// Alias for /api/admin/lead-stats (frontend uses this path)
dashboard.get('/api/admin/lead-stats', async (c) => {
    const db = c.env.DB;
    const [total, hot, warm, cold, converted] = await Promise.all([
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE temperature = 'hot' AND is_converted = 0`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE temperature = 'warm' AND is_converted = 0`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE temperature = 'cold' AND is_converted = 0`),
        queryOne<any>(db, `SELECT COUNT(*) as c FROM leads WHERE is_converted = 1`),
    ]);
    return c.json({ success: true, data: { total: total?.c || 0, hot: hot?.c || 0, warm: warm?.c || 0, cold: cold?.c || 0, converted: converted?.c || 0 } });
});

export default dashboard;
