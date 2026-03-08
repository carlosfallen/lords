// ============================================================
// Client Routes — Real Database Queries
// ============================================================
import { db, tenants, clientContracts, clientProducts, clientTeamMembers, tractionScores, moneyOnTableSnapshots, mentorshipTasks, users } from 'db';
import { eq, ilike, desc, sql, and, count } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const clientRoutes: RouteEntry[] = [
    ['GET', '/api/clients', async (req) => {
        const url = new URL(req.url);
        const search = url.searchParams.get('search') || '';
        const segment = url.searchParams.get('segment') || '';
        const page = Number(url.searchParams.get('page')) || 1;
        const limit = Number(url.searchParams.get('limit')) || 50;

        // Build conditions
        const conditions = [eq(tenants.isActive, true)];
        if (search) conditions.push(ilike(tenants.name, `%${search}%`));
        if (segment) conditions.push(eq(tenants.segment, segment));

        // Get tenants with contracts + mentor
        const allTenants = await db.select({
            id: tenants.id,
            name: tenants.name,
            niche: tenants.niche,
            city: tenants.city,
            state: tenants.state,
            segment: tenants.segment,
            tags: tenants.tags,
            email: tenants.email,
            phone: tenants.phone,
            mentorName: users.name,
            createdAt: tenants.createdAt,
            updatedAt: tenants.updatedAt,
        }).from(tenants)
            .leftJoin(users, eq(tenants.mentorId, users.id))
            .where(and(...conditions))
            .orderBy(desc(tenants.updatedAt));

        // Get MRR per tenant
        const contracts = await db.select({
            tenantId: clientContracts.tenantId,
            monthlyValue: clientContracts.monthlyValue,
        }).from(clientContracts)
            .where(eq(clientContracts.status, 'active'));

        const mrrMap = new Map<string, number>();
        for (const c of contracts) {
            mrrMap.set(c.tenantId, (mrrMap.get(c.tenantId) || 0) + Number(c.monthlyValue));
        }

        // Get latest traction score per tenant
        const latestScores = await db.select({
            tenantId: tractionScores.tenantId,
            score: tractionScores.score,
        }).from(tractionScores)
            .orderBy(desc(tractionScores.calculatedAt));

        const scoreMap = new Map<string, number>();
        for (const s of latestScores) {
            if (!scoreMap.has(s.tenantId)) scoreMap.set(s.tenantId, s.score);
        }

        // Combine
        const enrichedTenants = allTenants.map(t => ({
            ...t,
            location: `${t.city}/${t.state}`,
            mrr: mrrMap.get(t.id) || 0,
            score: scoreMap.get(t.id) || 0,
        }));

        // Stats
        const segmentCounts: Record<string, number> = {};
        for (const t of enrichedTenants) {
            segmentCounts[t.segment || 'Sem segmento'] = (segmentCounts[t.segment || 'Sem segmento'] || 0) + 1;
        }

        return Response.json({
            success: true,
            data: enrichedTenants.slice((page - 1) * limit, page * limit),
            meta: {
                total: enrichedTenants.length,
                page, limit,
                stats: {
                    total: enrichedTenants.length,
                    champions: segmentCounts['Campeão'] || 0,
                    growing: segmentCounts['Crescendo'] || 0,
                    atRisk: segmentCounts['Em Risco'] || 0,
                    critical: segmentCounts['Crítico'] || 0,
                },
            },
        });
    }],

    ['GET', '/api/clients/:id', async (_, params) => {
        const { id } = params;

        // Tenant basic data + mentor
        const [tenant] = await db.select({
            id: tenants.id,
            name: tenants.name,
            tradeName: tenants.tradeName,
            niche: tenants.niche,
            document: tenants.document,
            email: tenants.email,
            phone: tenants.phone,
            city: tenants.city,
            state: tenants.state,
            segment: tenants.segment,
            tags: tenants.tags,
            notes: tenants.notes,
            createdAt: tenants.createdAt,
            mentorName: users.name,
        }).from(tenants)
            .leftJoin(users, eq(tenants.mentorId, users.id))
            .where(eq(tenants.id, id));

        if (!tenant) {
            return Response.json({ success: false, error: 'Client not found' }, { status: 404 });
        }

        // Contract
        const [contract] = await db.select().from(clientContracts)
            .where(and(eq(clientContracts.tenantId, id), eq(clientContracts.status, 'active')))
            .limit(1);

        // Products (systems)
        const products = await db.select().from(clientProducts).where(eq(clientProducts.tenantId, id));

        // Traction scores (last 30 days)
        const traction = await db.select({
            score: tractionScores.score,
            calculatedAt: tractionScores.calculatedAt,
        }).from(tractionScores)
            .where(eq(tractionScores.tenantId, id))
            .orderBy(desc(tractionScores.calculatedAt))
            .limit(30);

        // Money on table
        const [mot] = await db.select().from(moneyOnTableSnapshots)
            .where(eq(moneyOnTableSnapshots.tenantId, id))
            .orderBy(desc(moneyOnTableSnapshots.calculatedAt))
            .limit(1);

        // Missions
        const missions = await db.select().from(mentorshipTasks)
            .where(eq(mentorshipTasks.tenantId, id))
            .orderBy(desc(mentorshipTasks.createdAt));

        // Team members
        const team = await db.select().from(clientTeamMembers).where(eq(clientTeamMembers.tenantId, id));

        const latestScore = traction[0]?.score || 0;

        // --- MÓDULO 4.2: Telemetria Multi-tenant (Hub de Dashboards Nichados) ---
        let layoutType = 'generic';
        let telemetry: any[] = [];

        const nicheLower = (tenant.niche || '').toLowerCase();

        if (nicheLower.includes('delivery') || nicheLower.includes('restaurante') || nicheLower.includes('alimento')) {
            layoutType = 'delivery';
            telemetry = [
                { label: 'Tempo Médio Entrega', value: '38 min', trend: '-2 min', isPositive: true },
                { label: 'Taxa de Recompra (30d)', value: '42%', trend: '+5%', isPositive: true },
                { label: 'Ticket Médio (Ifood)', value: 'R$ 78,50', trend: '-R$ 2', isPositive: false },
                { label: 'Cancelamentos', value: '1.2%', trend: '-0.3%', isPositive: true },
            ];
        } else if (nicheLower.includes('clínica') || nicheLower.includes('agendamento') || nicheLower.includes('serviço') || nicheLower.includes('estética')) {
            layoutType = 'services';
            telemetry = [
                { label: 'Taxa de No-Show (Faltas)', value: '18%', trend: '+2%', isPositive: false },
                { label: 'Reagendamentos', value: '25%', trend: '-5%', isPositive: true },
                { label: 'Ocupação da Agenda', value: '82%', trend: '+10%', isPositive: true },
                { label: 'Ticket Médio Serviço', value: 'R$ 215,00', trend: '+R$ 15', isPositive: true },
            ];
        } else {
            layoutType = 'generic';
            telemetry = [
                { label: 'CAC Estimado', value: 'R$ 45,00', trend: '-R$ 5', isPositive: true },
                { label: 'LTV Estimado', value: 'R$ 850,00', trend: '+R$ 50', isPositive: true },
                { label: 'Taxa de Conversão Funil', value: '12%', trend: '+1.5%', isPositive: true },
                { label: 'Tempo Médio Resposta', value: '15 min', trend: '-5 min', isPositive: true },
            ];
        }
        // ------------------------------------------------------------------------

        return Response.json({
            success: true,
            data: {
                ...tenant,
                location: `${tenant.city}/${tenant.state}`,
                mrr: Number(contract?.monthlyValue || 0),
                plan: contract?.planName || '',
                score: latestScore,
                systemsCount: products.length,
                layoutType,
                telemetry,
                tractionHistory: traction.reverse().map(t => ({
                    score: t.score,
                    date: t.calculatedAt,
                })),
                moneyOnTable: mot ? {
                    total: Number(mot.totalLost),
                    unansweredLeads: Number(mot.unansweredLeadsLoss || 0),
                    noShows: Number(mot.noShowLoss || 0),
                    stuckLeads: Number(mot.stuckLeadsLoss || 0),
                    lowConversion: Number(mot.lowConversionLoss || 0),
                } : null,
                missions: missions.map(m => ({
                    id: m.id,
                    title: m.title,
                    status: m.status,
                    priority: m.priority,
                    dueDate: m.dueDate,
                    checklist: m.checklist,
                })),
                systems: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    type: p.systemType,
                    version: p.version,
                    status: p.status,
                    accessUrl: p.accessUrl,
                })),
                team: team.map(t => ({
                    id: t.id,
                    name: t.name,
                    role: t.role,
                    totalAttendances: t.totalAttendances,
                    conversionRate: Number(t.conversionRate || 0),
                })),
            },
        });
    }],

    ['POST', '/api/clients', async (req) => {
        const body = await req.json();
        const user = (req as any)._user;

        const [newTenant] = await db.insert(tenants).values({
            name: body.name,
            tradeName: body.tradeName,
            niche: body.niche,
            email: body.email,
            phone: body.phone,
            city: body.city,
            state: body.state,
            segment: 'Crescendo',
            mentorId: body.mentorId || user?.sub,
        }).returning();

        return Response.json({ success: true, data: newTenant }, { status: 201 });
    }],

    ['PUT', '/api/clients/:id', async (req, params) => {
        const body = await req.json();
        const [updated] = await db.update(tenants).set({
            ...body,
            updatedAt: new Date(),
        }).where(eq(tenants.id, params.id)).returning();

        if (!updated) {
            return Response.json({ success: false, error: 'Client not found' }, { status: 404 });
        }

        return Response.json({ success: true, data: updated });
    }],
];
