// ============================================================
// Pipeline Routes — Real Database Queries
// ============================================================
import { db, dealsPipeline, users, leads } from 'db';
import { eq, desc, inArray, notExists } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

const STAGES = [
    { id: 'lead', name: 'Lead', order: 1, color: '#6B7280' },
    { id: 'qualification', name: 'Qualificação', order: 2, color: '#3B82F6' },
    { id: 'demo', name: 'Demo', order: 3, color: '#8B5CF6' },
    { id: 'proposal', name: 'Proposta', order: 4, color: '#F59E0B' },
    { id: 'negotiation', name: 'Negociação', order: 5, color: '#EF4444' },
    { id: 'closing', name: 'Fechamento', order: 6, color: '#10B981' },
];

export const pipelineRoutes: RouteEntry[] = [
    ['GET', '/api/pipeline', async () => {
        // Backfill missing leads into dealsPipeline
        const missingLeads = await db.select().from(leads).where(
            notExists(db.select().from(dealsPipeline).where(eq(dealsPipeline.leadId, leads.id)))
        );

        if (missingLeads.length > 0) {
            await db.insert(dealsPipeline).values(missingLeads.map(l => ({
                leadId: l.id,
                title: l.name ? `Lead - ${l.name}` : `Lead - ${l.phone}`,
                contactName: l.name || 'Sem Nome',
                contactPhone: l.phone,
                contactEmail: l.email,
                productOfInterest: l.productOfInterest,
                proposedValue: l.estimatedValue,
                status: 'open' as const,
                stage: 'lead',
                temperature: l.temperature,
                assignedToId: l.assignedToId,
            })));
        }

        const deals = await db.select({
            id: dealsPipeline.id,
            title: dealsPipeline.title,
            contactName: dealsPipeline.contactName,
            contactPhone: dealsPipeline.contactPhone,
            stage: dealsPipeline.stage,
            temperature: dealsPipeline.temperature,
            proposedValue: dealsPipeline.proposedValue,
            nextStep: dealsPipeline.nextStep,
            nextStepDate: dealsPipeline.nextStepDate,
            status: dealsPipeline.status,
            createdAt: dealsPipeline.createdAt,
            assignedTo: users.name,
        }).from(dealsPipeline)
            .leftJoin(users, eq(dealsPipeline.assignedToId, users.id))
            .where(eq(dealsPipeline.status, 'open'))
            .orderBy(desc(dealsPipeline.createdAt));

        return Response.json({
            success: true,
            data: {
                stages: STAGES,
                deals: deals.map(d => ({
                    ...d,
                    proposedValue: Number(d.proposedValue || 0),
                })),
            },
        });
    }],

    ['PUT', '/api/pipeline/:id/move', async (req, params) => {
        const { stage } = await req.json();
        const [updated] = await db.update(dealsPipeline)
            .set({ stage, updatedAt: new Date() })
            .where(eq(dealsPipeline.id, params.id))
            .returning();

        if (!updated) return Response.json({ success: false, error: 'Deal not found' }, { status: 404 });
        return Response.json({ success: true, data: updated });
    }],

    ['POST', '/api/pipeline', async (req) => {
        const body = await req.json();
        const user = (req as any)._user;

        const [newDeal] = await db.insert(dealsPipeline).values({
            title: body.title,
            contactName: body.contactName,
            contactPhone: body.contactPhone,
            productOfInterest: body.productOfInterest,
            proposedValue: body.proposedValue,
            temperature: body.temperature || 'cold',
            assignedToId: body.assignedToId || user?.sub,
            nextStep: body.nextStep,
        }).returning();

        return Response.json({ success: true, data: newDeal }, { status: 201 });
    }],

    // Look up deal by contact phone (for idempotent create from chat)
    ['GET', '/api/pipeline/by-phone/:phone', async (_, params) => {
        const phone = decodeURIComponent(params.phone);
        const [deal] = await db.select({
            id: dealsPipeline.id,
            title: dealsPipeline.title,
            contactName: dealsPipeline.contactName,
            contactPhone: dealsPipeline.contactPhone,
            stage: dealsPipeline.stage,
            temperature: dealsPipeline.temperature,
            status: dealsPipeline.status,
        }).from(dealsPipeline)
            .where(eq(dealsPipeline.contactPhone, phone))
            .orderBy(desc(dealsPipeline.createdAt))
            .limit(1);

        if (!deal) return Response.json({ success: true, data: null });
        return Response.json({ success: true, data: deal });
    }],
];
