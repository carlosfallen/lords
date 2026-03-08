// ============================================================
// Lead Routes — Real Database Queries + CRM Enhancements
// ============================================================
import { db, leads, leadConversations, leadActivities, leadNotes, leadProposals, users, dealsPipeline } from 'db';
import { eq, desc, ilike, and } from 'drizzle-orm';
import { createAuditLog } from './audit';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

// Critical fields that require justification to edit
const CRITICAL_FIELDS = ['name', 'phone'];

export const leadRoutes: RouteEntry[] = [
    ['GET', '/api/leads', async (req) => {
        const url = new URL(req.url);
        const temperature = url.searchParams.get('temperature') || '';
        const status = url.searchParams.get('status') || '';
        const cidade = url.searchParams.get('cidade') || '';
        const user = (req as any)._user;

        const conditions: any[] = [eq(leads.isConverted, false)];
        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: true, data: [] });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }

        if (temperature) conditions.push(eq(leads.temperature, temperature as any));
        if (status) conditions.push(eq(leads.status, status));
        if (cidade) conditions.push(eq(leads.cidade, cidade));

        const allLeads = await db.select({
            id: leads.id,
            name: leads.name,
            phone: leads.phone,
            email: leads.email,
            niche: leads.niche,
            cidade: leads.cidade,
            temperature: leads.temperature,
            source: leads.source,
            productOfInterest: leads.productOfInterest,
            estimatedValue: leads.estimatedValue,
            lastContactAt: leads.lastContactAt,
            nextFollowUpAt: leads.nextFollowUpAt,
            snoozeUntil: leads.snoozeUntil,
            status: leads.status,
            currentFunnelStageId: leads.currentFunnelStageId,
            representativeId: leads.representativeId,
            createdAt: leads.createdAt,
            assignedTo: users.name,
        }).from(leads)
            .leftJoin(users, eq(leads.assignedToId, users.id))
            .where(and(...conditions))
            .orderBy(desc(leads.createdAt));

        return Response.json({ success: true, data: allLeads });
    }],

    ['GET', '/api/leads/:id', async (req, params) => {
        const user = (req as any)._user;
        const conditions: any[] = [eq(leads.id, params.id)];

        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }

        const [lead] = await db.select().from(leads).where(and(...conditions));
        if (!lead) return Response.json({ success: false, error: 'Lead not found or access denied' }, { status: 404 });

        // Fetch related data
        const [messages, activities, notes, proposals] = await Promise.all([
            db.select().from(leadConversations)
                .where(eq(leadConversations.leadId, params.id))
                .orderBy(leadConversations.createdAt),
            db.select({
                id: leadActivities.id,
                canal: leadActivities.canal,
                resultado: leadActivities.resultado,
                observacao: leadActivities.observacao,
                contactedAt: leadActivities.contactedAt,
                createdAt: leadActivities.createdAt,
                userName: users.name,
            }).from(leadActivities)
                .leftJoin(users, eq(leadActivities.userId, users.id))
                .where(eq(leadActivities.leadId, params.id))
                .orderBy(desc(leadActivities.contactedAt)),
            db.select({
                id: leadNotes.id,
                texto: leadNotes.texto,
                createdAt: leadNotes.createdAt,
                userName: users.name,
            }).from(leadNotes)
                .leftJoin(users, eq(leadNotes.userId, users.id))
                .where(eq(leadNotes.leadId, params.id))
                .orderBy(desc(leadNotes.createdAt)),
            db.select({
                id: leadProposals.id,
                tipo: leadProposals.tipo,
                arquivoPdfUrl: leadProposals.arquivoPdfUrl,
                url: leadProposals.url,
                statusProposta: leadProposals.statusProposta,
                observacaoAdmin: leadProposals.observacaoAdmin,
                createdAt: leadProposals.createdAt,
            }).from(leadProposals)
                .where(eq(leadProposals.leadId, params.id))
                .orderBy(desc(leadProposals.createdAt)),
        ]);

        return Response.json({
            success: true,
            data: { ...lead, messages, activities, notes, proposals },
        });
    }],

    ['POST', '/api/leads', async (req) => {
        const body = await req.json();
        const user = (req as any)._user;

        let repId = body.representativeId;
        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Rep missing' }, { status: 403 });
            repId = user.representativeId;
        }

        const [newLead] = await db.insert(leads).values({
            name: body.name,
            phone: body.phone,
            email: body.email,
            niche: body.niche,
            cidade: body.cidade || null,
            observacaoInicial: body.observacaoInicial || null,
            temperature: body.temperature || 'cold',
            source: body.source || 'whatsapp_direct',
            productOfInterest: body.productOfInterest,
            estimatedValue: body.estimatedValue,
            assignedToId: body.assignedToId || user?.sub,
            representativeId: repId,
            currentFunnelStageId: body.currentFunnelStageId || null,
            status: 'ativo',
        }).returning();

        await createAuditLog({
            userId: user.sub,
            action: 'CREATE_LEAD',
            entityType: 'lead',
            entityId: newLead.id,
        });

        // Auto-create a deal in the pipeline for this new lead
        await db.insert(dealsPipeline).values({
            leadId: newLead.id,
            title: newLead.name ? `Lead - ${newLead.name}` : `Lead - ${newLead.phone}`,
            contactName: newLead.name || 'Sem Nome',
            contactPhone: newLead.phone,
            contactEmail: newLead.email,
            productOfInterest: newLead.productOfInterest,
            proposedValue: newLead.estimatedValue,
            status: 'open',
            stage: 'lead',
            temperature: newLead.temperature,
            assignedToId: newLead.assignedToId,
        });

        return Response.json({ success: true, data: newLead }, { status: 201 });
    }],

    ['PUT', '/api/leads/:id', async (req, params) => {
        const body = await req.json();
        const user = (req as any)._user;
        const conditions: any[] = [eq(leads.id, params.id)];

        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }

        // Fetch existing lead for comparison
        const [existing] = await db.select().from(leads).where(and(...conditions));
        if (!existing) return Response.json({ success: false, error: 'Lead not found or access denied' }, { status: 404 });

        // Check if critical fields are being changed (representante only)
        if (user?.role === 'representante') {
            for (const field of CRITICAL_FIELDS) {
                if (body[field] !== undefined && body[field] !== (existing as any)[field]) {
                    if (!body.justification) {
                        return Response.json({
                            success: false,
                            error: `Justificativa obrigatória ao alterar campo crítico: ${field}`,
                        }, { status: 400 });
                    }
                    // Log critical field change
                    await createAuditLog({
                        userId: user.sub,
                        action: 'EDIT_CRITICAL_FIELD',
                        entityType: 'lead',
                        entityId: params.id,
                        fieldName: field,
                        oldValue: String((existing as any)[field] || ''),
                        newValue: String(body[field]),
                        justification: body.justification,
                    });
                }
            }
        }

        // If status being set to 'perdido', require motivo
        if (body.status === 'perdido' && !body.motivoPerdaTexto) {
            return Response.json({ success: false, error: 'motivo_perda is required when marking lead as perdido' }, { status: 400 });
        }

        // Remove justification from the update body
        const { justification, ...updateData } = body;

        const [updated] = await db.update(leads).set({ ...updateData, updatedAt: new Date() })
            .where(eq(leads.id, params.id)).returning();

        // Log status changes
        if (body.status && body.status !== existing.status) {
            await createAuditLog({
                userId: user.sub,
                action: 'CHANGE_STATUS',
                entityType: 'lead',
                entityId: params.id,
                fieldName: 'status',
                oldValue: existing.status,
                newValue: body.status,
            });
        }

        // Log temperature changes
        if (body.temperature && body.temperature !== existing.temperature) {
            await createAuditLog({
                userId: user.sub,
                action: 'CHANGE_TEMPERATURE',
                entityType: 'lead',
                entityId: params.id,
                fieldName: 'temperature',
                oldValue: existing.temperature,
                newValue: body.temperature,
            });
        }

        return Response.json({ success: true, data: updated });
    }],

    // Snooze follow-up
    ['PUT', '/api/leads/:id/snooze', async (req, params) => {
        const body = await req.json();
        const user = (req as any)._user;
        const conditions: any[] = [eq(leads.id, params.id)];

        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }

        const [existing] = await db.select({ id: leads.id }).from(leads).where(and(...conditions));
        if (!existing) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        if (!body.snoozeUntil || !body.snoozeMotivo) {
            return Response.json({ success: false, error: 'snoozeUntil and snoozeMotivo are required' }, { status: 400 });
        }

        const [updated] = await db.update(leads).set({
            snoozeUntil: new Date(body.snoozeUntil),
            snoozeMotivo: body.snoozeMotivo,
            updatedAt: new Date(),
        }).where(eq(leads.id, params.id)).returning();

        await createAuditLog({
            userId: user.sub,
            action: 'SNOOZE_FOLLOWUP',
            entityType: 'lead',
            entityId: params.id,
            newValue: body.snoozeUntil,
            justification: body.snoozeMotivo,
        });

        return Response.json({ success: true, data: updated });
    }],

    // Set next follow-up
    ['PUT', '/api/leads/:id/follow-up', async (req, params) => {
        const body = await req.json();
        const user = (req as any)._user;
        const conditions: any[] = [eq(leads.id, params.id)];

        if (user?.role === 'representante') {
            if (!user.representativeId) return Response.json({ success: false, error: 'Access denied' }, { status: 403 });
            conditions.push(eq(leads.representativeId, user.representativeId));
        }

        const [existing] = await db.select({ id: leads.id }).from(leads).where(and(...conditions));
        if (!existing) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        if (!body.nextFollowUpAt) {
            return Response.json({ success: false, error: 'nextFollowUpAt is required' }, { status: 400 });
        }

        const [updated] = await db.update(leads).set({
            nextFollowUpAt: new Date(body.nextFollowUpAt),
            updatedAt: new Date(),
        }).where(eq(leads.id, params.id)).returning();

        return Response.json({ success: true, data: updated });
    }],
];
