// ============================================================
// Proposal Adjustment Requests — CRM Routes
// ============================================================
import { db, proposalAdjustmentRequests, leads, users } from 'db';
import { eq, desc, and } from 'drizzle-orm';
import { createAuditLog } from './audit';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const proposalAdjustmentRoutes: RouteEntry[] = [
    // Representante creates request
    ['POST', '/api/leads/:leadId/proposal-adjustment', async (req, params) => {
        const user = (req as any)._user;
        const body = await req.json();

        if (!body.mensagem?.trim()) {
            return Response.json({ success: false, error: 'mensagem is required' }, { status: 400 });
        }

        // Verify lead access for representante
        if (user?.role === 'representante') {
            const conditions = [eq(leads.id, params.leadId), eq(leads.representativeId, user.representativeId)];
            const [lead] = await db.select({ id: leads.id }).from(leads).where(and(...conditions));
            if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });
        }

        const [request] = await db.insert(proposalAdjustmentRequests).values({
            leadId: params.leadId,
            representanteId: user.sub,
            mensagem: body.mensagem.trim(),
        }).returning();

        return Response.json({ success: true, data: request }, { status: 201 });
    }],

    // Admin lists pending requests
    ['GET', '/api/proposal-adjustments', async (req) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Admin only' }, { status: 403 });
        }

        const url = new URL(req.url);
        const statusFilter = url.searchParams.get('status');

        const conditions: any[] = [];
        if (statusFilter) conditions.push(eq(proposalAdjustmentRequests.status, statusFilter));

        const requests = await db.select({
            id: proposalAdjustmentRequests.id,
            leadId: proposalAdjustmentRequests.leadId,
            mensagem: proposalAdjustmentRequests.mensagem,
            status: proposalAdjustmentRequests.status,
            adminResponse: proposalAdjustmentRequests.adminResponse,
            respondedAt: proposalAdjustmentRequests.respondedAt,
            createdAt: proposalAdjustmentRequests.createdAt,
            representanteName: users.name,
        }).from(proposalAdjustmentRequests)
            .leftJoin(users, eq(proposalAdjustmentRequests.representanteId, users.id))
            .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(proposalAdjustmentRequests.createdAt));

        return Response.json({ success: true, data: requests });
    }],

    // Admin responds to request
    ['PUT', '/api/proposal-adjustments/:id', async (req, params) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Admin only' }, { status: 403 });
        }

        const body = await req.json();
        const [updated] = await db.update(proposalAdjustmentRequests).set({
            status: body.status,
            adminResponse: body.adminResponse || null,
            respondedAt: new Date(),
            respondedByAdminId: user.sub,
        }).where(eq(proposalAdjustmentRequests.id, params.id)).returning();

        if (!updated) return Response.json({ success: false, error: 'Not found' }, { status: 404 });

        await createAuditLog({
            userId: user.sub,
            action: 'RESPOND_PROPOSAL_ADJUSTMENT',
            entityType: 'proposal_adjustment_request',
            entityId: params.id,
            changes: { status: { old: 'pendente', new: body.status } },
        });

        return Response.json({ success: true, data: updated });
    }],
];
