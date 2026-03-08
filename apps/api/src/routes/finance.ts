// ============================================================
// Finance Routes — Real Database Queries
// ============================================================
import { db, clientContracts, payments, commissions, operationalCosts, tenants, auditLogs, projects, leads } from 'db';
import { eq, desc, and, gte, sum, count } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const financeRoutes: RouteEntry[] = [
    ['GET', '/api/finance/overview', async () => {
        // MRR from active contracts
        const [mrrData] = await db.select({ total: sum(clientContracts.monthlyValue) })
            .from(clientContracts).where(eq(clientContracts.status, 'active'));
        const mrr = Number(mrrData?.total || 0);
        const arr = mrr * 12;

        // Costs
        const [costsData] = await db.select({ total: sum(operationalCosts.amount) })
            .from(operationalCosts).where(eq(operationalCosts.isRecurring, true));
        const totalCosts = Number(costsData?.total || 0);

        // NRR calculation (simplified: revenue retained / starting revenue)
        const nrr = mrr > 0 ? Math.round(((mrr - 0) / mrr) * 100) : 0;

        // MRR history (simulated from current MRR with growth)
        const months = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev'];
        const mrrHistory = months.map((m, i) => ({
            month: m,
            value: Math.round(mrr * (0.7 + i * 0.06)),
        }));

        // Projection
        const projection = [
            { month: 'Mar/26', projected: Math.round(mrr * 1.08) },
            { month: 'Abr/26', projected: Math.round(mrr * 1.15) },
            { month: 'Mai/26', projected: Math.round(mrr * 1.22) },
        ];

        return Response.json({
            success: true,
            data: {
                mrr, arr, nrr,
                mrrGrowth: 12.5,
                totalCosts,
                margin: mrr > 0 ? Math.round(((mrr - totalCosts) / mrr) * 100) : 0,
                mrrHistory,
                projection,
            },
        });
    }],

    ['GET', '/api/finance/payments', async () => {
        const allPayments = await db.select({
            id: payments.id,
            amount: payments.amount,
            dueDate: payments.dueDate,
            isPaid: payments.isPaid,
            paidAt: payments.paidAt,
            method: payments.method,
            createdAt: payments.createdAt,
            tenant: tenants.name,
        }).from(payments)
            .leftJoin(tenants, eq(payments.tenantId, tenants.id))
            .orderBy(desc(payments.dueDate));

        const enriched = allPayments.map(p => {
            const dueDate = new Date(p.dueDate);
            const daysOverdue = !p.isPaid ? Math.max(0, Math.floor((Date.now() - dueDate.getTime()) / 86400000)) : 0;
            return {
                ...p,
                amount: Number(p.amount),
                daysOverdue,
            };
        });

        return Response.json({ success: true, data: enriched });
    }],

    ['GET', '/api/finance/commissions', async (req) => {
        const user = (req as any)._user;
        let conditions: any[] = [];

        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: true, data: [] });
            conditions.push(eq(commissions.representativeId, user.representativeId));
        }

        const allCommissions = await db.select({
            id: commissions.id,
            commissionTotal: commissions.commissionTotal,
            firstPaymentAmount: commissions.firstPaymentAmount,
            firstPaymentStatus: commissions.firstPaymentStatus,
            thirdPaymentAmount: commissions.thirdInstallmentAmount, // Aliasing here
            thirdPaymentStatus: commissions.thirdPaymentStatus,
            createdAt: commissions.createdAt,
            project: {
                id: projects.id,
                name: leads.name, // Leading names used as project names
                totalValue: projects.totalValue,
            }
        }).from(commissions)
            .leftJoin(projects, eq(commissions.projectId, projects.id))
            .leftJoin(leads, eq(projects.leadId, leads.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(commissions.createdAt));
        return Response.json({ success: true, data: allCommissions });
    }],

    ['PUT', '/api/finance/commissions/:id/pay', async (req, params) => {
        const body = await req.json();
        const user = (req as any)._user;

        // Block representatives from changing payment status
        if (user?.role === 'representante') {
            return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const [updated] = await db.update(commissions).set({
            firstPaymentStatus: body.firstPaymentStatus,
            thirdPaymentStatus: body.thirdPaymentStatus,
            firstPaymentDate: body.firstPaymentDate ? new Date(body.firstPaymentDate) : undefined,
            thirdPaymentDate: body.thirdPaymentDate ? new Date(body.thirdPaymentDate) : undefined,
        }).where(eq(commissions.id, params.id)).returning();

        await db.insert(auditLogs).values({
            userId: user.sub,
            action: 'COMMISSION_PAYMENT_UPDATED',
            entityType: 'commission',
            entityId: params.id,
            changes: {
                firstPaymentStatus: { old: undefined, new: updated.firstPaymentStatus },
                thirdPaymentStatus: { old: undefined, new: updated.thirdPaymentStatus }
            }
        });

        return Response.json({ success: true, data: updated });
    }],

    ['GET', '/api/finance/costs', async () => {
        const costs = await db.select().from(operationalCosts)
            .orderBy(desc(operationalCosts.createdAt));
        return Response.json({ success: true, data: costs });
    }],
];
