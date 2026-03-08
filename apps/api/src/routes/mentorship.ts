// ============================================================
// Mentorship Routes — Real Database Queries
// ============================================================
import { db, mentorshipTasks, mentorshipSessions, playbooks, tenants, users, moneyOnTableSnapshots } from 'db';
import { eq, desc } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const mentorshipRoutes: RouteEntry[] = [
    ['GET', '/api/mentorship/money-on-table', async () => {
        // Obter o snapshot mais recente de cada tenant para a tela global da agência
        const snapshots = await db.select({
            id: moneyOnTableSnapshots.id,
            tenant: tenants.name,
            totalLost: moneyOnTableSnapshots.totalLost,
            unansweredLeadsLoss: moneyOnTableSnapshots.unansweredLeadsLoss,
            noShowLoss: moneyOnTableSnapshots.noShowLoss,
            stuckLeadsLoss: moneyOnTableSnapshots.stuckLeadsLoss,
            stuckInventoryLoss: moneyOnTableSnapshots.stuckInventoryLoss,
            lowConversionLoss: moneyOnTableSnapshots.lowConversionLoss,
            calculatedAt: moneyOnTableSnapshots.calculatedAt,
        }).from(moneyOnTableSnapshots)
            .leftJoin(tenants, eq(moneyOnTableSnapshots.tenantId, tenants.id))
            .orderBy(desc(moneyOnTableSnapshots.calculatedAt));

        // Por simplicidade no MVP, agruparemos para pegar só o último snapshot de cada cliente
        // e depois faremos a soma total geral pro Dashboard
        const uniqueSnapshots = Array.from(new Map(snapshots.map(s => [s.tenant, s])).values());

        return Response.json({ success: true, data: uniqueSnapshots });
    }],

    ['GET', '/api/mentorship/missions', async () => {
        const missions = await db.select({
            id: mentorshipTasks.id,
            title: mentorshipTasks.title,
            description: mentorshipTasks.description,
            priority: mentorshipTasks.priority,
            status: mentorshipTasks.status,
            dueDate: mentorshipTasks.dueDate,
            completedAt: mentorshipTasks.completedAt,
            checklist: mentorshipTasks.checklist,
            createdAt: mentorshipTasks.createdAt,
            tenant: tenants.name,
            createdBy: users.name,
        }).from(mentorshipTasks)
            .leftJoin(tenants, eq(mentorshipTasks.tenantId, tenants.id))
            .leftJoin(users, eq(mentorshipTasks.createdByUserId, users.id))
            .orderBy(desc(mentorshipTasks.createdAt));

        return Response.json({ success: true, data: missions });
    }],

    ['GET', '/api/mentorship/playbooks', async () => {
        const pbs = await db.select().from(playbooks).where(eq(playbooks.isActive, true));
        return Response.json({ success: true, data: pbs });
    }],

    ['GET', '/api/mentorship/sessions', async () => {
        const sessions = await db.select({
            id: mentorshipSessions.id,
            scheduledAt: mentorshipSessions.scheduledAt,
            duration: mentorshipSessions.duration,
            notes: mentorshipSessions.notes,
            decisions: mentorshipSessions.decisions,
            tractionBefore: mentorshipSessions.tractionScoreBefore,
            tractionAfter: mentorshipSessions.tractionScoreAfter,
            tenant: tenants.name,
            mentor: users.name,
        }).from(mentorshipSessions)
            .leftJoin(tenants, eq(mentorshipSessions.tenantId, tenants.id))
            .leftJoin(users, eq(mentorshipSessions.mentorId, users.id))
            .orderBy(desc(mentorshipSessions.scheduledAt));

        return Response.json({ success: true, data: sessions });
    }],

    ['POST', '/api/mentorship/missions', async (req) => {
        const body = await req.json();
        const user = (req as any)._user;

        const [newMission] = await db.insert(mentorshipTasks).values({
            tenantId: body.tenantId,
            title: body.title,
            description: body.description,
            priority: body.priority || 'normal',
            createdByUserId: user?.sub,
            dueDate: body.dueDate ? new Date(body.dueDate) : null,
            checklist: body.checklist || [],
            blocksAccess: body.priority === 'urgent' ? true : false,
            playbookId: body.playbookId || null,
        }).returning();

        return Response.json({ success: true, data: newMission }, { status: 201 });
    }],

    ['PUT', '/api/mentorship/missions/:id', async (req, params) => {
        const body = await req.json();
        const updateData: any = { ...body, updatedAt: new Date() };
        if (body.status === 'completed') updateData.completedAt = new Date();

        const [updated] = await db.update(mentorshipTasks).set(updateData)
            .where(eq(mentorshipTasks.id, params.id)).returning();
        if (!updated) return Response.json({ success: false, error: 'Mission not found' }, { status: 404 });
        return Response.json({ success: true, data: updated });
    }],
];
