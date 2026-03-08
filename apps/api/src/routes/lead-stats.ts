// ============================================================
// Lead Stats — Admin Metrics Routes
// ============================================================
import { db, leads, leadActivities, users } from 'db';
import { eq, desc, and, count, sql, gte, lte, isNull, or } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const leadStatsRoutes: RouteEntry[] = [
    // Admin metrics per vendor
    ['GET', '/api/admin/lead-stats', async (req) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Admin only' }, { status: 403 });
        }

        const url = new URL(req.url);
        const vendedorId = url.searchParams.get('vendedorId');

        const conditions: any[] = [];
        if (vendedorId) conditions.push(eq(leads.representativeId, vendedorId));

        // Basic counts
        const allLeads = await db.select({
            id: leads.id,
            status: leads.status,
            temperature: leads.temperature,
            lastContactAt: leads.lastContactAt,
            currentFunnelStageId: leads.currentFunnelStageId,
            snoozeUntil: leads.snoozeUntil,
            representativeId: leads.representativeId,
        }).from(leads)
            .where(conditions.length ? and(...conditions) : undefined);

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const stats = {
            total: allLeads.length,
            ativos: allLeads.filter(l => l.status === 'ativo').length,
            fechados: allLeads.filter(l => l.status === 'fechado').length,
            perdidos: allLeads.filter(l => l.status === 'perdido').length,
            atrasados: allLeads.filter(l => {
                if (l.status !== 'ativo') return false;
                if (l.snoozeUntil && new Date(l.snoozeUntil) > now) return false;
                if (!l.lastContactAt) return true;
                return new Date(l.lastContactAt) < oneDayAgo;
            }).length,
            porTemperatura: {
                frio: allLeads.filter(l => l.temperature === 'cold').length,
                morno: allLeads.filter(l => l.temperature === 'warm').length,
                quente: allLeads.filter(l => l.temperature === 'hot').length,
            },
            mediasDiasSemContato: (() => {
                const ativos = allLeads.filter(l => l.status === 'ativo' && l.lastContactAt);
                if (ativos.length === 0) return 0;
                const totalDias = ativos.reduce((sum, l) => {
                    const diff = (now.getTime() - new Date(l.lastContactAt!).getTime()) / (1000 * 60 * 60 * 24);
                    return sum + diff;
                }, 0);
                return Math.round((totalDias / ativos.length) * 10) / 10;
            })(),
        };

        return Response.json({ success: true, data: stats });
    }],

    // Action summary for the current representante
    ['GET', '/api/leads/action-summary', async (req) => {
        const user = (req as any)._user;
        const conditions: any[] = [eq(leads.status, 'ativo')];

        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: true, data: { atrasados: 0, followUpHoje: 0 } });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }

        const activeLeads = await db.select({
            id: leads.id,
            lastContactAt: leads.lastContactAt,
            nextFollowUpAt: leads.nextFollowUpAt,
            snoozeUntil: leads.snoozeUntil,
            temperature: leads.temperature,
        }).from(leads).where(and(...conditions));

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        const atrasados = activeLeads.filter(l => {
            if (l.snoozeUntil && new Date(l.snoozeUntil) > now) return false;
            if (!l.lastContactAt) return true;
            return new Date(l.lastContactAt) < oneDayAgo;
        }).length;

        const followUpHoje = activeLeads.filter(l => {
            if (!l.nextFollowUpAt) return false;
            const f = new Date(l.nextFollowUpAt);
            return f >= todayStart && f < todayEnd;
        }).length;

        const quentesSemContato = activeLeads.filter(l =>
            l.temperature === 'hot' &&
            (!l.lastContactAt || new Date(l.lastContactAt) < oneDayAgo)
        ).length;

        return Response.json({
            success: true,
            data: { atrasados, followUpHoje, quentesSemContato, totalAtivos: activeLeads.length },
        });
    }],

    // Admin reassign lead
    ['PUT', '/api/admin/leads/:id/reassign', async (req, params) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Admin only' }, { status: 403 });
        }

        const body = await req.json();
        if (!body.newOwnerId) {
            return Response.json({ success: false, error: 'newOwnerId is required' }, { status: 400 });
        }

        const [existing] = await db.select({
            id: leads.id,
            representativeId: leads.representativeId,
        }).from(leads).where(eq(leads.id, params.id));

        if (!existing) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        const [updated] = await db.update(leads).set({
            representativeId: body.newOwnerId,
            assignedToId: body.newOwnerId,
            updatedAt: new Date(),
        }).where(eq(leads.id, params.id)).returning();

        // Audit
        const { createAuditLog } = await import('./audit');
        await createAuditLog({
            userId: user.sub,
            action: 'REASSIGN_LEAD',
            entityType: 'lead',
            entityId: params.id,
            fieldName: 'representativeId',
            oldValue: existing.representativeId || '',
            newValue: body.newOwnerId,
            justification: body.motivo || 'Admin reassignment',
        });

        return Response.json({ success: true, data: updated });
    }],
];
