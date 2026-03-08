// ============================================================
// Reports Routes
// ============================================================
import { db, moneyOnTableSnapshots, tractionScores, tenants } from 'db';
import { desc, eq, max } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const reportRoutes: RouteEntry[] = [
    ['GET', '/api/reports', async () => {
        // Obtains latest global snapshot for all tenants, to be compiled into a global report. 
        const latestScores = await db
            .select({
                tenantName: tenants.tradeName,
                score: tractionScores.score,
                calculatedAt: tractionScores.calculatedAt,
            })
            .from(tractionScores)
            .leftJoin(tenants, eq(tractionScores.tenantId, tenants.id))
            .orderBy(desc(tractionScores.calculatedAt))
            .limit(50);

        const moneySnapshots = await db
            .select({
                tenantName: tenants.tradeName,
                totalLost: moneyOnTableSnapshots.totalLost,
                unansweredLeadsLoss: moneyOnTableSnapshots.unansweredLeadsLoss,
                noShowLoss: moneyOnTableSnapshots.noShowLoss,
                stuckLeadsLoss: moneyOnTableSnapshots.stuckLeadsLoss,
                periodEnd: moneyOnTableSnapshots.periodEnd,
            })
            .from(moneyOnTableSnapshots)
            .leftJoin(tenants, eq(moneyOnTableSnapshots.tenantId, tenants.id))
            .orderBy(desc(moneyOnTableSnapshots.periodEnd))
            .limit(50);

        return Response.json({
            success: true,
            data: {
                tractionReports: latestScores,
                financialLostReports: moneySnapshots,
                generatedAt: new Date().toISOString()
            }
        });
    }],
];
