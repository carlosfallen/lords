// ============================================================
// Campaigns Routes
// ============================================================
import { db, internalCampaigns } from 'db';
import { desc, count, sum, sql } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const campaignRoutes: RouteEntry[] = [
    ['GET', '/api/campaigns', async () => {
        const campaigns = await db.select().from(internalCampaigns).orderBy(desc(internalCampaigns.createdAt));

        const [stats] = await db.select({
            totalSpent: sum(internalCampaigns.spent),
            totalLeads: sum(internalCampaigns.leadsGenerated),
            avgCpl: sql<number>`avg(nullif(${internalCampaigns.cpl}, 0))`
        }).from(internalCampaigns);

        let totalConversions = 0;
        campaigns.forEach(c => totalConversions += Number(c.conversions || 0));

        return Response.json({
            success: true,
            data: {
                campaigns,
                stats: {
                    totalSpent: Number(stats?.totalSpent || 0),
                    totalLeads: Number(stats?.totalLeads || 0),
                    avgCpl: Number(stats?.avgCpl || 0),
                    totalConversions
                }
            }
        });
    }],

    // Create campaign
    ['POST', '/api/campaigns', async (req) => {
        const body = await req.json();
        if (!body.name) return Response.json({ success: false, error: 'Nome é obrigatório' }, { status: 400 });

        const [campaign] = await db.insert(internalCampaigns).values({
            name: body.name,
            source: body.platform || 'other',
            status: 'active',
        } as any).returning();

        return Response.json({ success: true, data: campaign }, { status: 201 });
    }],

    // Delete campaign
    ['DELETE', '/api/campaigns/:id', async (_, params) => {
        const { eq: eqFn } = await import('drizzle-orm');
        await db.delete(internalCampaigns).where(eqFn(internalCampaigns.id, params.id));
        return Response.json({ success: true });
    }],
];
