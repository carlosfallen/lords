// ============================================================
// Lead Notes — CRM Routes
// ============================================================
import { db, leadNotes, leads, users } from 'db';
import { eq, desc, and } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const leadNoteRoutes: RouteEntry[] = [
    // List notes for a lead
    ['GET', '/api/leads/:leadId/notes', async (req, params) => {
        const user = (req as any)._user;
        const conditions: any[] = [eq(leads.id, params.leadId)];
        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }
        const [lead] = await db.select({ id: leads.id }).from(leads).where(and(...conditions));
        if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        const notes = await db.select({
            id: leadNotes.id,
            texto: leadNotes.texto,
            createdAt: leadNotes.createdAt,
            userName: users.name,
        }).from(leadNotes)
            .leftJoin(users, eq(leadNotes.userId, users.id))
            .where(eq(leadNotes.leadId, params.leadId))
            .orderBy(desc(leadNotes.createdAt));

        return Response.json({ success: true, data: notes });
    }],

    // Create note
    ['POST', '/api/leads/:leadId/notes', async (req, params) => {
        const user = (req as any)._user;
        const body = await req.json();

        const conditions: any[] = [eq(leads.id, params.leadId)];
        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }
        const [lead] = await db.select({ id: leads.id }).from(leads).where(and(...conditions));
        if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        if (!body.texto?.trim()) {
            return Response.json({ success: false, error: 'texto is required' }, { status: 400 });
        }

        const [note] = await db.insert(leadNotes).values({
            leadId: params.leadId,
            userId: user.sub,
            texto: body.texto.trim(),
        }).returning();

        return Response.json({ success: true, data: note }, { status: 201 });
    }],
];
