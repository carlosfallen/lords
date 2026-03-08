// ============================================================
// Delete Requests — CRM Routes (Soft-delete via approval)
// ============================================================
import { db, deleteRequests, leads, users } from 'db';
import { eq, desc, and } from 'drizzle-orm';
import { createAuditLog } from './audit';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const deleteRequestRoutes: RouteEntry[] = [
    // Representante creates a delete request
    ['POST', '/api/leads/:leadId/delete-request', async (req, params) => {
        const user = (req as any)._user;
        const body = await req.json();

        if (!body.motivo?.trim()) {
            return Response.json({ success: false, error: 'motivo is required' }, { status: 400 });
        }

        // Verify lead access for representante
        if (user?.role === 'representante') {
            const conditions = [eq(leads.id, params.leadId), eq(leads.representativeId, user.representativeId)];
            const [lead] = await db.select({ id: leads.id }).from(leads).where(and(...conditions));
            if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        const [request] = await db.insert(deleteRequests).values({
            leadId: params.leadId,
            representanteId: user.sub,
            motivo: body.motivo.trim(),
        }).returning();

        await createAuditLog({
            userId: user.sub,
            action: 'REQUEST_DELETE',
            entityType: 'lead',
            entityId: params.leadId,
        });

        return Response.json({ success: true, data: request }, { status: 201 });
    }],

    // Admin lists delete requests
    ['GET', '/api/delete-requests', async (req) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Admin only' }, { status: 403 });
        }

        const url = new URL(req.url);
        const statusFilter = url.searchParams.get('status');
        const conditions: any[] = [];
        if (statusFilter) conditions.push(eq(deleteRequests.status, statusFilter));

        const requests = await db.select({
            id: deleteRequests.id,
            leadId: deleteRequests.leadId,
            motivo: deleteRequests.motivo,
            status: deleteRequests.status,
            adminMotivo: deleteRequests.adminMotivo,
            decidedAt: deleteRequests.decidedAt,
            createdAt: deleteRequests.createdAt,
            representanteName: users.name,
            leadName: leads.name,
            leadPhone: leads.phone,
        }).from(deleteRequests)
            .leftJoin(users, eq(deleteRequests.representanteId, users.id))
            .leftJoin(leads, eq(deleteRequests.leadId, leads.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(deleteRequests.createdAt));

        return Response.json({ success: true, data: requests });
    }],

    // Admin approves or rejects
    ['PUT', '/api/delete-requests/:id', async (req, params) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Admin only' }, { status: 403 });
        }

        const body = await req.json();
        if (!['aprovado', 'recusado'].includes(body.status)) {
            return Response.json({ success: false, error: 'status must be aprovado or recusado' }, { status: 400 });
        }

        const [updated] = await db.update(deleteRequests).set({
            status: body.status,
            adminMotivo: body.adminMotivo || null,
            decidedAt: new Date(),
            decidedByAdminId: user.sub,
        }).where(eq(deleteRequests.id, params.id)).returning();

        if (!updated) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

        // If approved, mark lead as soft-deleted (status = 'excluido')
        if (body.status === 'aprovado') {
            await db.update(leads).set({
                status: 'excluido',
                updatedAt: new Date(),
            }).where(eq(leads.id, updated.leadId));
        }

        await createAuditLog({
            userId: user.sub,
            action: body.status === 'aprovado' ? 'APPROVE_DELETE' : 'REJECT_DELETE',
            entityType: 'lead',
            entityId: updated.leadId,
            justification: body.adminMotivo,
        });

        return Response.json({ success: true, data: updated });
    }],
];
