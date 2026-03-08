// ============================================================
// Lead Proposals — CRM Routes (Admin-only write)
// ============================================================
import { db, leadProposals, leads, users } from 'db';
import { eq, desc, and } from 'drizzle-orm';
import { createAuditLog } from './audit';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const leadProposalRoutes: RouteEntry[] = [
    // List proposals for a lead (both rep and admin)
    ['GET', '/api/leads/:leadId/proposals', async (req, params) => {
        const user = (req as any)._user;
        const conditions: any[] = [eq(leads.id, params.leadId)];
        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }
        const [lead] = await db.select({ id: leads.id }).from(leads).where(and(...conditions));
        if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        const proposals = await db.select({
            id: leadProposals.id,
            tipo: leadProposals.tipo,
            arquivoPdfUrl: leadProposals.arquivoPdfUrl,
            url: leadProposals.url,
            statusProposta: leadProposals.statusProposta,
            observacaoAdmin: leadProposals.observacaoAdmin,
            createdAt: leadProposals.createdAt,
            updatedAt: leadProposals.updatedAt,
            adminName: users.name,
        }).from(leadProposals)
            .leftJoin(users, eq(leadProposals.createdByAdminId, users.id))
            .where(eq(leadProposals.leadId, params.leadId))
            .orderBy(desc(leadProposals.createdAt));

        return Response.json({ success: true, data: proposals });
    }],

    // Create proposal — Admin ONLY
    ['POST', '/api/leads/:leadId/proposals', async (req, params) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Only admins can create proposals' }, { status: 403 });
        }

        const body = await req.json();
        if (!body.tipo || !['pdf', 'link'].includes(body.tipo)) {
            return Response.json({ success: false, error: 'tipo must be pdf or link' }, { status: 400 });
        }

        const [proposal] = await db.insert(leadProposals).values({
            leadId: params.leadId,
            createdByAdminId: user.sub,
            tipo: body.tipo,
            arquivoPdfUrl: body.arquivoPdfUrl || null,
            url: body.url || null,
            observacaoAdmin: body.observacaoAdmin || null,
            statusProposta: body.statusProposta || 'ativa',
        }).returning();

        await createAuditLog({
            userId: user.sub,
            action: 'CREATE_PROPOSAL',
            entityType: 'lead_proposal',
            entityId: proposal.id,
        });

        return Response.json({ success: true, data: proposal }, { status: 201 });
    }],

    // Update proposal — Admin ONLY
    ['PUT', '/api/leads/:leadId/proposals/:id', async (req, params) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Only admins can update proposals' }, { status: 403 });
        }

        const body = await req.json();
        const [updated] = await db.update(leadProposals).set({
            ...body,
            updatedAt: new Date(),
        }).where(and(
            eq(leadProposals.id, params.id),
            eq(leadProposals.leadId, params.leadId),
        )).returning();

        if (!updated) return Response.json({ success: false, error: 'Proposal not found' }, { status: 404 });

        await createAuditLog({
            userId: user.sub,
            action: 'UPDATE_PROPOSAL',
            entityType: 'lead_proposal',
            entityId: params.id,
        });

        return Response.json({ success: true, data: updated });
    }],
];
