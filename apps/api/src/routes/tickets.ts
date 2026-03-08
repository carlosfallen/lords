// ============================================================
// Ticket Routes — Real Database Queries
// ============================================================
import { db, supportTickets, tenants, users } from 'db';
import { eq, desc, and } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const ticketRoutes: RouteEntry[] = [
    ['GET', '/api/tickets', async (req) => {
        const url = new URL(req.url);
        const status = url.searchParams.get('status') || '';
        const priority = url.searchParams.get('priority') || '';

        const conditions: any[] = [];
        if (status) conditions.push(eq(supportTickets.status, status as any));
        if (priority) conditions.push(eq(supportTickets.priority, priority as any));

        const tickets = await db.select({
            id: supportTickets.id,
            title: supportTickets.title,
            description: supportTickets.description,
            priority: supportTickets.priority,
            status: supportTickets.status,
            systemType: supportTickets.systemType,
            slaFirstResponseHours: supportTickets.slaFirstResponseHours,
            slaResolutionHours: supportTickets.slaResolutionHours,
            firstResponseAt: supportTickets.firstResponseAt,
            resolvedAt: supportTickets.resolvedAt,
            messages: supportTickets.messages,
            createdAt: supportTickets.createdAt,
            tenantName: tenants.name,
            assignedTo: users.name,
        }).from(supportTickets)
            .leftJoin(tenants, eq(supportTickets.tenantId, tenants.id))
            .leftJoin(users, eq(supportTickets.assignedToId, users.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(supportTickets.createdAt));

        // Calculate elapsed time
        const enriched = tickets.map(t => {
            const elapsed = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
            return { ...t, elapsed: Math.round(elapsed * 10) / 10, slaHours: t.slaResolutionHours || 24 };
        });

        return Response.json({ success: true, data: enriched });
    }],

    ['POST', '/api/tickets', async (req) => {
        const body = await req.json();
        const user = (req as any)._user;

        const [newTicket] = await db.insert(supportTickets).values({
            tenantId: body.tenantId,
            title: body.title,
            description: body.description,
            priority: body.priority || 'medium',
            systemType: body.systemType,
            assignedToId: body.assignedToId,
            createdByUserId: user?.sub,
            slaFirstResponseHours: body.priority === 'urgent' ? 1 : body.priority === 'high' ? 4 : 8,
            slaResolutionHours: body.priority === 'urgent' ? 4 : body.priority === 'high' ? 24 : 48,
        }).returning();

        return Response.json({ success: true, data: newTicket }, { status: 201 });
    }],

    ['PUT', '/api/tickets/:id', async (req, params) => {
        const body = await req.json();
        const updateData: any = { ...body, updatedAt: new Date() };
        if (body.status === 'resolved') updateData.resolvedAt = new Date();
        if (body.status === 'closed') updateData.closedAt = new Date();

        const [updated] = await db.update(supportTickets).set(updateData)
            .where(eq(supportTickets.id, params.id)).returning();
        if (!updated) return Response.json({ success: false, error: 'Ticket not found' }, { status: 404 });
        return Response.json({ success: true, data: updated });
    }],
];
