// ============================================================
// Projects Routes — Real Database Queries
// ============================================================
import { db, projects, commissions, leads, auditLogs } from 'db';
import { eq, desc } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const projectRoutes: RouteEntry[] = [
    ['GET', '/api/projects', async (req) => {
        const user = (req as any)._user;
        let conditions = [];

        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: true, data: [] });
            conditions.push(eq(projects.representativeId, user.representativeId));
        }

        const allProjects = await db.select().from(projects)
            .orderBy(desc(projects.createdAt)); // Note: add where clauses dynamically if needed

        // For simplicity, just filtering in memory or modifying the query builder:
        const data = allProjects.filter(p => user?.role === 'representante' ? p.representativeId === user.representativeId : true);

        return Response.json({ success: true, data });
    }],

    ['POST', '/api/projects', async (req) => {
        const body = await req.json();
        const user = (req as any)._user;

        // Block representatives from creating projects directly
        if (user?.role === 'representante') {
            return Response.json({ success: false, error: 'Forbidden. Only internal users can create projects.' }, { status: 403 });
        }

        // Create Project
        const [project] = await db.insert(projects).values({
            leadId: body.leadId,
            totalValue: body.totalValue,
            entryValue: body.entryValue,
            installmentsCount: body.installmentsCount,
            installmentValue: body.installmentValue,
            status: body.status || 'negociacao',
            representativeId: body.representativeId,
        }).returning();

        // If a representative is assigned, calculate and insert the commission automatically
        if (body.representativeId && body.totalValue) {
            const commissionPercent = body.commissionPercent || 15; // default or fetched
            const commissionTotal = (body.totalValue * commissionPercent) / 100;
            const half = commissionTotal / 2;

            await db.insert(commissions).values({
                userId: user.sub, // The admin/finance who created it
                representativeId: body.representativeId,
                projectId: project.id,
                amount: String(commissionTotal),
                percentage: String(commissionPercent),
                commissionTotal: String(commissionTotal),
                firstPaymentAmount: String(half),
                thirdInstallmentAmount: String(half),
                firstPaymentStatus: 'pendente',
                thirdPaymentStatus: 'pendente',
            });
        }

        // Audit log
        await db.insert(auditLogs).values({
            userId: user.sub,
            action: 'PROJECT_CREATED',
            entityType: 'project',
            entityId: project.id,
        });

        return Response.json({ success: true, data: project }, { status: 201 });
    }],
];
