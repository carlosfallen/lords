// ============================================================
// Lead Activities (Tentativas de Contato) — CRM Routes
// ============================================================
import { db, leadActivities, leads, users } from 'db';
import { eq, desc, and } from 'drizzle-orm';
import { createAuditLog } from './audit';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const leadActivityRoutes: RouteEntry[] = [
    // List activities for a lead
    ['GET', '/api/leads/:leadId/activities', async (req, params) => {
        const user = (req as any)._user;
        // Verify lead access
        const conditions: any[] = [eq(leads.id, params.leadId)];
        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }
        const [lead] = await db.select({ id: leads.id }).from(leads).where(and(...conditions));
        if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        const activities = await db.select({
            id: leadActivities.id,
            canal: leadActivities.canal,
            resultado: leadActivities.resultado,
            observacao: leadActivities.observacao,
            contactedAt: leadActivities.contactedAt,
            createdAt: leadActivities.createdAt,
            userName: users.name,
        }).from(leadActivities)
            .leftJoin(users, eq(leadActivities.userId, users.id))
            .where(eq(leadActivities.leadId, params.leadId))
            .orderBy(desc(leadActivities.contactedAt));

        return Response.json({ success: true, data: activities });
    }],

    // Create activity (tentativa de contato)
    ['POST', '/api/leads/:leadId/activities', async (req, params) => {
        const user = (req as any)._user;
        const body = await req.json();

        // Verify lead access
        const conditions: any[] = [eq(leads.id, params.leadId)];
        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }
        const [lead] = await db.select({ id: leads.id }).from(leads).where(and(...conditions));
        if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        if (!body.canal || !body.resultado) {
            return Response.json({ success: false, error: 'canal and resultado are required' }, { status: 400 });
        }

        const contactedAt = body.contactedAt ? new Date(body.contactedAt) : new Date();

        const [activity] = await db.insert(leadActivities).values({
            leadId: params.leadId,
            userId: user.sub,
            canal: body.canal,
            resultado: body.resultado,
            observacao: body.observacao || null,
            contactedAt,
        }).returning();

        // Update lead.lastContactAt
        await db.update(leads).set({
            lastContactAt: contactedAt,
            updatedAt: new Date(),
        }).where(eq(leads.id, params.leadId));

        // Audit log
        await createAuditLog({
            userId: user.sub,
            action: 'CREATE_ACTIVITY',
            entityType: 'lead_activity',
            entityId: activity.id,
            changes: { canal: { old: null, new: body.canal }, resultado: { old: null, new: body.resultado } },
        });

        return Response.json({ success: true, data: activity }, { status: 201 });
    }],
];
