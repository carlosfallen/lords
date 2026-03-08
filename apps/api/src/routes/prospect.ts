// ============================================================
// Prospector Routes — Now operates on REAL CRM leads table
// ============================================================
import { db, prospectCampaigns, prospectQueues, prospectLogs, leads, users, leadConversations } from 'db';
import { eq, desc, and, count, sql, ilike, or, isNull } from 'drizzle-orm';
import { queueWorker } from '../services/prospectQueue.service';
import { loadProspectingState } from '../services/prospectConversationState.service';
import { shouldSendFollowup } from '../services/followUpOrchestrator.service';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response> | Response];

// Helper: resolve tenantId from JWT or fallback to DB/ENV
async function resolveTenantId(req: Request): Promise<string | null> {
    const user = (req as any)?._user;
    if (user?.tenantId) return user.tenantId;
    if (user?.role === 'super_admin') {
        if (process.env.TENANT_ID) return process.env.TENANT_ID;
        const [firstTenant] = await db.select({ id: leads.tenantId }).from(leads).limit(1);
        return firstTenant?.id || null;
    }
    return null;
}

export const prospectRoutes: RouteEntry[] = [
    // ─── CAMPAIGNS ──────────────────────────────────────────────
    ['GET', '/api/prospect/campaigns', async (req) => {
        const tenantId = await resolveTenantId(req);
        const items = await db.select().from(prospectCampaigns)
            .where(tenantId ? eq(prospectCampaigns.tenantId, tenantId) : undefined)
            .orderBy(desc(prospectCampaigns.createdAt));
        return Response.json({ success: true, data: items });
    }],

    ['POST', '/api/prospect/campaigns', async (req) => {
        const tenantId = await resolveTenantId(req);
        if (!tenantId) return Response.json({ success: false, error: 'Tenant required' }, { status: 400 });
        const body = await req.json();
        const [campaign] = await db.insert(prospectCampaigns).values({
            tenantId,
            name: body.name,
            channelType: body.channelType || 'whatsapp',
            playbookBasePrompt: body.playbookBasePrompt,
            sendRatePerHour: body.sendRatePerHour || 50,
        }).returning();
        return Response.json({ success: true, data: campaign });
    }],

    // ─── LEADS (reads from the REAL CRM leads table) ────────────
    ['GET', '/api/prospect/contacts', async (req) => {
        const tenantId = await resolveTenantId(req);
        const url = new URL(req.url, 'http://localhost');
        const search = url.searchParams.get('search') || '';
        const status = url.searchParams.get('status') || '';
        const temperature = url.searchParams.get('temperature') || '';
        const limit = parseInt(url.searchParams.get('limit') || '300');

        const conditions: any[] = [];
        // Include leads matching this tenant OR unassigned leads (NULL tenant_id)
        // Most leads were created via WA sync or manual entry without tenant context
        if (tenantId) conditions.push(or(eq(leads.tenantId, tenantId), isNull(leads.tenantId)));
        if (status) conditions.push(eq(leads.status, status));
        if (temperature) conditions.push(eq(leads.temperature, temperature as any));
        if (search) {
            conditions.push(
                or(
                    ilike(leads.name, `%${search}%`),
                    ilike(leads.phone, `%${search}%`),
                    ilike(leads.cidade, `%${search}%`)
                )
            );
        }

        const items = await db.select({
            id: leads.id,
            name: leads.name,
            phone: leads.phone,
            email: leads.email,
            company: leads.productOfInterest,
            city: leads.cidade,
            temperature: leads.temperature,
            status: leads.status,
            source: leads.source,
            isConverted: leads.isConverted,
            lastContactAt: leads.lastContactAt,
            createdAt: leads.createdAt,
            updatedAt: leads.updatedAt,
        }).from(leads)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(leads.updatedAt))
            .limit(limit);

        return Response.json({ success: true, data: items });
    }],

    // ─── QUEUE ENQUEUE (enqueues real CRM lead IDs) ─────────────
    ['POST', '/api/prospect/queue/enqueue', async (req) => {
        const tenantId = await resolveTenantId(req);
        if (!tenantId) return Response.json({ success: false, error: 'Tenant required' }, { status: 400 });
        const body = await req.json();
        const { contactIds, campaignId } = body;

        if (!campaignId) {
            return Response.json({ success: false, error: 'campaignId is required' }, { status: 400 });
        }
        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return Response.json({ success: false, error: 'contactIds array is required' }, { status: 400 });
        }

        let enqueued = 0;
        for (const leadId of contactIds) {
            try {
                await db.insert(prospectQueues).values({
                    tenantId,
                    campaignId,
                    contactId: leadId, // This is now a leads.id
                    channelType: 'whatsapp',
                    status: 'pending',
                    priority: 0,
                });
                enqueued++;
            } catch (err: any) {
                // Skip duplicates or invalid IDs
                console.warn(`[Queue] Failed to enqueue lead ${leadId}:`, err?.message);
            }
        }

        return Response.json({ success: true, data: { enqueuedCount: enqueued } });
    }],

    // ─── QUEUE CONTROL ──────────────────────────────────────────
    ['POST', '/api/prospect/queue/start', async () => {
        queueWorker.start();
        return Response.json({ success: true, data: { isRunning: true } });
    }],

    ['POST', '/api/prospect/queue/stop', async () => {
        queueWorker.stop();
        return Response.json({ success: true, data: { isRunning: false } });
    }],

    ['GET', '/api/prospect/queue/status', async (req) => {
        const tenantId = await resolveTenantId(req);
        const conditions: any[] = [];
        if (tenantId) conditions.push(eq(prospectQueues.tenantId, tenantId));

        const [pending] = await db.select({ total: count() }).from(prospectQueues)
            .where(and(...conditions, eq(prospectQueues.status, 'pending')));
        const [completed] = await db.select({ total: count() }).from(prospectQueues)
            .where(and(...conditions, eq(prospectQueues.status, 'completed')));
        const [failed] = await db.select({ total: count() }).from(prospectQueues)
            .where(and(...conditions, eq(prospectQueues.status, 'failed')));
        const [active] = await db.select({ total: count() }).from(prospectQueues)
            .where(and(...conditions, eq(prospectQueues.status, 'active')));

        return Response.json({
            success: true,
            data: {
                isRunning: queueWorker.isRunning,
                stats: {
                    pending: Number(pending?.total || 0),
                    active: Number(active?.total || 0),
                    processed: Number(completed?.total || 0),
                    failed: Number(failed?.total || 0),
                }
            }
        });
    }],

    // ─── QUEUE LIST (shows recent queue items with lead names) ───
    ['GET', '/api/prospect/queue', async (req) => {
        const tenantId = await resolveTenantId(req);
        const url = new URL(req.url, 'http://localhost');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        // Join queue items with REAL leads table and campaigns
        const items = await db.select({
            id: prospectQueues.id,
            status: prospectQueues.status,
            priority: prospectQueues.priority,
            attempts: prospectQueues.attempts,
            lastError: prospectQueues.lastError,
            scheduledAt: prospectQueues.scheduledAt,
            createdAt: prospectQueues.createdAt,
            contactName: leads.name,
            contactPhone: leads.phone,
            campaignName: prospectCampaigns.name,
        })
            .from(prospectQueues)
            .leftJoin(leads, eq(prospectQueues.contactId, leads.id))
            .leftJoin(prospectCampaigns, eq(prospectQueues.campaignId, prospectCampaigns.id))
            .where(tenantId ? eq(prospectQueues.tenantId, tenantId) : undefined)
            .orderBy(desc(prospectQueues.createdAt))
            .limit(limit);

        return Response.json({ success: true, data: items });
    }],

    // ─── DELETE LEAD (from the real CRM leads table) ────────────
    ['DELETE', '/api/prospect/contacts/:id', async (_, params) => {
        await db.delete(leads).where(eq(leads.id, params.id));
        return Response.json({ success: true });
    }],

    // ─── PROSPECT STATE per lead (Section 20 schema) ────────────
    ['GET', '/api/prospect/contacts/:id/state', async (_, params) => {
        try {
            const { state, lead } = await loadProspectingState(params.id);
            const followupCheck = await shouldSendFollowup(params.id);
            return Response.json({
                success: true,
                data: {
                    leadId: params.id,
                    leadName: lead.name,
                    leadPhone: lead.phone,
                    state,
                    followup: {
                        eligible: followupCheck.should,
                        reason: followupCheck.reason,
                        nextTemplate: followupCheck.templateId,
                    },
                },
            });
        } catch (e: any) {
            return Response.json({ success: false, error: e?.message }, { status: 404 });
        }
    }],

    // ─── PLAYBOOK METRICS (aggregate across all active prospects) ─
    ['GET', '/api/prospect/metrics', async (req) => {
        const tenantId = await resolveTenantId(req);

        const activeLeads = await db.select({
            id: leads.id,
            metadata: leads.metadata,
        }).from(leads)
            .where(tenantId ? or(eq(leads.tenantId, tenantId), isNull(leads.tenantId)) : undefined)
            .limit(500);

        const metrics = {
            total: 0,
            active: 0,
            byState: {} as Record<string, number>,
            byRoute: { responsible: 0, non_responsible: 0, unknown: 0 },
            byMeeting: { none: 0, exploring: 0, proposed: 0, confirmed: 0 },
            byOutcome: {} as Record<string, number>,
            byChannel: {} as Record<string, number>,
            byInterest: { low: 0, medium: 0, high: 0, unknown: 0 },
            followupStages: [0, 0, 0, 0, 0],
        };

        for (const { metadata } of activeLeads) {
            const meta = (metadata as any) || {};
            const p = meta.prospecting;
            if (!p || (!p.isProspecting && !p.isActive)) continue;

            metrics.total++;
            if (p.isActive || p.isProspecting) metrics.active++;

            // By state
            const state = p.conversationState || 'unknown';
            metrics.byState[state] = (metrics.byState[state] || 0) + 1;

            // By route
            if (p.routeType === 'responsible') metrics.byRoute.responsible++;
            else if (p.routeType === 'non_responsible') metrics.byRoute.non_responsible++;
            else metrics.byRoute.unknown++;

            // By meeting
            const meeting = p.meetingStatus || 'none';
            if (meeting in metrics.byMeeting) (metrics.byMeeting as any)[meeting]++;

            // By outcome
            const outcome = p.conversationOutcome || 'in_progress';
            metrics.byOutcome[outcome] = (metrics.byOutcome[outcome] || 0) + 1;

            // By channel
            const channel = p.currentOrderChannel || 'unknown';
            metrics.byChannel[channel] = (metrics.byChannel[channel] || 0) + 1;

            // By interest
            const interest = p.interestLevel || 'unknown';
            if (interest in metrics.byInterest) (metrics.byInterest as any)[interest]++;

            // Follow-up stages
            const stage = Math.min(p.followupStage || 0, 4);
            metrics.followupStages[stage]++;
        }

        return Response.json({ success: true, data: metrics });
    }],

    // ─── QUEUE WAITING_RESPONSE status ─────────────────────────
    ['GET', '/api/prospect/queue/active', async (req) => {
        const tenantId = await resolveTenantId(req);
        const items = await db.select({
            id: prospectQueues.id,
            status: prospectQueues.status,
            createdAt: prospectQueues.createdAt,
            contactName: leads.name,
            contactPhone: leads.phone,
            leadMetadata: leads.metadata,
            campaignName: prospectCampaigns.name,
        })
            .from(prospectQueues)
            .leftJoin(leads, eq(prospectQueues.contactId, leads.id))
            .leftJoin(prospectCampaigns, eq(prospectQueues.campaignId, prospectCampaigns.id))
            .where(
                and(
                    tenantId ? eq(prospectQueues.tenantId, tenantId) : undefined,
                    or(
                        eq(prospectQueues.status, 'waiting_response'),
                        eq(prospectQueues.status, 'processing'),
                    ),
                )
            )
            .orderBy(desc(prospectQueues.createdAt))
            .limit(50);

        const enriched = items.map((item) => {
            const meta = (item.leadMetadata as any) || {};
            const p = meta.prospecting || {};
            return {
                ...item,
                leadMetadata: undefined,
                prospectState: {
                    conversationState: p.conversationState || 'S0_OPENING',
                    routeType: p.routeType || 'unknown',
                    meetingStatus: p.meetingStatus || 'none',
                    followupStage: p.followupStage || 0,
                    interestLevel: p.interestLevel || 'unknown',
                    conversationOutcome: p.conversationOutcome || 'in_progress',
                },
            };
        });

        return Response.json({ success: true, data: enriched });
    }],
];
