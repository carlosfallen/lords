// ============================================================
// Client Portal Routes — For the Client's limited view
// ============================================================
import { db, mentorshipTasks } from 'db';
import { eq, desc, and } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const clientPortalRoutes: RouteEntry[] = [
    // Get all missions for the logged-in client
    ['GET', '/api/client-portal/missions', async (req) => {
        const user = (req as any)._user;
        if (!user || !user.tenantId) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const missions = await db.select()
            .from(mentorshipTasks)
            .where(eq(mentorshipTasks.tenantId, user.tenantId))
            .orderBy(desc(mentorshipTasks.createdAt));

        return Response.json({ success: true, data: missions });
    }],

    // Update specific mission (check off checklist items)
    ['PUT', '/api/client-portal/missions/:id', async (req, params) => {
        const user = (req as any)._user;
        if (!user || !user.tenantId) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // Ensure mission belongs to tenant
        const [existing] = await db.select().from(mentorshipTasks).where(and(
            eq(mentorshipTasks.id, params.id),
            eq(mentorshipTasks.tenantId, user.tenantId)
        )).limit(1);

        if (!existing) {
            return Response.json({ success: false, error: 'Mission not found' }, { status: 404 });
        }

        const updateData: any = { updatedAt: new Date() };

        if (body.checklist) updateData.checklist = body.checklist;
        if (body.status) {
            updateData.status = body.status;
            if (body.status === 'completed') updateData.completedAt = new Date();
        }

        const [updated] = await db.update(mentorshipTasks)
            .set(updateData)
            .where(eq(mentorshipTasks.id, params.id))
            .returning();

        return Response.json({ success: true, data: updated });
    }]
];
