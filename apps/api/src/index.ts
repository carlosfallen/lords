// ============================================================
// Império Lord Master CRM — Main API Server (Bun)
// ============================================================
import { authRoutes } from './routes/auth';
import { dashboardRoutes } from './routes/dashboard';
import { clientRoutes } from './routes/clients';
import { leadRoutes } from './routes/leads';
import { pipelineRoutes } from './routes/pipeline';
import { ticketRoutes } from './routes/tickets';
import { financeRoutes } from './routes/finance';
import { teamRoutes } from './routes/team';
import { mentorshipRoutes } from './routes/mentorship';
import { botRoutes } from './routes/bot';
import { documentRoutes } from './routes/documents';
import { auditRoutes } from './routes/audit';
import { campaignRoutes } from './routes/campaigns';
import { systemRoutes } from './routes/systems';
import { ideaRoutes } from './routes/ideas';
import { wikiRoutes } from './routes/wiki';
import { onboardingRoutes } from './routes/onboarding';
import { reportRoutes } from './routes/reports';
import { clientPortalRoutes } from './routes/client-portal';
import { prospectRoutes } from './routes/prospect';
import { projectRoutes } from './routes/projects';
import { userRoutes } from './routes/users';
import { configRoutes } from './routes/config';
import { healthRoutes } from './routes/health';
import { leadActivityRoutes } from './routes/lead-activities';
import { leadNoteRoutes } from './routes/lead-notes';
import { leadProposalRoutes } from './routes/lead-proposals';
import { proposalAdjustmentRoutes } from './routes/proposal-adjustments';
import { deleteRequestRoutes } from './routes/delete-requests';
import { cityPresentationRoutes } from './routes/city-presentations';
import { leadStatsRoutes } from './routes/lead-stats';
import { handleWebSocket, wsClients } from './websocket';
import { verifyToken } from './middleware/auth';
import Redis from 'ioredis';
import { broadcast } from './websocket';
import { prospectAiService } from './services/prospectAi.service';
import { conversationRouterService } from './services/conversationRouter.service';
import { startFollowUpCron } from './services/followUpCron';
import { db, leads, leadConversations } from 'db';
import { eq, sql, and } from 'drizzle-orm';

const PORT = Number(process.env.API_PORT) || 4000;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';


// ─── Dolphin Engine (Rust) Listener ──────────────────────────
const redisSub = new Redis(redisUrl);
const redisPub = new Redis(redisUrl);

redisSub.subscribe('channel:bot_events', 'channel:wa_messages', (err) => {
    if (err) console.error('Failed to subscribe to Redis channels:', err);
    else console.log('🐬 Conectado aos canais Redis: bot_events + wa_messages');
});

// ─── WhatsApp Message Persistence ────────────────────────────
async function persistWaMessage(data: any) {
    console.log(`[WA Persist Debug] Raw payload:`, JSON.stringify(data));
    try {
        const rawPhone = data.phone || data.Phone;
        let phone = rawPhone?.replace(/\D/g, ''); // clean non-digits

        // Add BR country code if missing
        if (phone && (phone.length === 10 || phone.length === 11)) {
            phone = `55${phone}`;
        }

        if (!phone) {
            console.warn(`[WA Msg] Ignorando payload sem telefone válido:`, data);
            return;
        }

        // 1. Atomic Upsert lead by phone + tenantId
        let tenantId = data.tenantId || data.TenantID;
        if (!tenantId) {
            // Fallback to default tenant if configured, otherwise reject
            tenantId = process.env.TENANT_ID;
        }

        if (!tenantId) {
            console.error(`❌ [WA Persist] Rejeitando lead ${phone}: tenantId ausente na payload e no ENV.`);
            return;
        }

        const msgId = data.msgId || data.MsgID;
        const eventType = data.type || data.Type;
        const isFromMe = data.isFromMe !== undefined ? data.isFromMe : data.IsFromMe;

        // If fromMe is true AND it's a new message, pushName belongs to the seller.
        const incomingName = data.pushName || data.PushName;
        let resolvedName = phone;
        if (incomingName && (!isFromMe || eventType === 'message.history')) {
            resolvedName = incomingName;
        }

        const timestamp = data.timestamp || data.Timestamp;
        const createdAt = timestamp ? new Date(timestamp) : new Date();

        let leadId;
        const existingLeads = await db.select({ id: leads.id, name: leads.name }).from(leads).where(
            and(eq(leads.phone, phone), eq(leads.tenantId, tenantId))
        ).limit(1);

        if (existingLeads.length > 0) {
            leadId = existingLeads[0].id;
            const updates: any = { lastContactAt: createdAt, updatedAt: new Date() };
            
            // Fix existing incorrect names when the true lead responds
            if (!isFromMe && incomingName && existingLeads[0].name !== incomingName) {
                updates.name = incomingName;
            }

            await db.update(leads)
                .set(updates)
                .where(eq(leads.id, leadId));
        } else {
            const [newLead] = await db.insert(leads).values({
                phone,
                name: resolvedName,
                tenantId,
                temperature: 'cold',
                source: 'whatsapp_direct',
                lastContactAt: createdAt,
                updatedAt: new Date(),
            }).returning({ id: leads.id });
            leadId = newLead.id;
        }

        // 2. Insert message with deduplication (DB unique constraint handles this)
        const direction = isFromMe ? 'outbound' : 'inbound';

        let senderType = 'bot';
        if (!isFromMe) {
            senderType = 'lead';
        } else if (eventType === 'message.new') {
            // Message synced from external device (human typed on WhatsApp App)
            senderType = 'human';
        }

        // Auto-Takeover: if a human responds from the physical device, pause bots
        if (senderType === 'human') {
            const [localLead] = await db.select({ metadata: leads.metadata }).from(leads).where(eq(leads.id, leadId)).limit(1);
            const meta = (localLead?.metadata as any) || {};
            if (meta.botActive !== false || meta.conversationMode !== 'human') {
                await db.update(leads).set({
                    metadata: { ...meta, botActive: false, conversationMode: 'human' }
                }).where(eq(leads.id, leadId));
                console.log(`[Takeover] Human interaction detected on physical device for ${phone}. Automation locked to Human Mode.`);
            }
        }

        const mediaType = data.mediaType || data.MediaType || 'text';
        const text = data.text || data.Text;
        const messageType = mediaType;
        const [msg] = await db.insert(leadConversations).values({
            leadId: leadId,
            direction,
            senderType,
            messageType,
            content: text,
            waMessageId: msgId || null,
            createdAt,
        })
            .onConflictDoNothing({ target: leadConversations.waMessageId })
            .returning();

        if (!msg) return; // Deduplicated

        // 4. Broadcast to CRM frontend in real-time
        if (eventType === 'message.new' || eventType === 'message.sent' || eventType === 'message.history' || eventType === 'message.received') {
            console.log(`[WA Persist] Broadcast message de ${phone} (tipo: ${eventType})`);
            broadcast('wa.message', {
                leadId: leadId,
                phone,
                pushName: data.pushName || data.PushName,
                message: {
                    id: msg.id,
                    direction,
                    senderType,
                    messageType,
                    content: text,
                    createdAt: createdAt.toISOString(),
                },
            }, { targetTenantId: tenantId });

            // 5. Phase 8: Centralized Mode Routing
            if (eventType === 'message.new' && !isFromMe) {
                // Determine whether it goes to Human, Prospecting, or Support Brain
                conversationRouterService.routeMessage(leadId, phone, text, msgId, createdAt.getTime(), tenantId);
            }
        }
    } catch (err: any) {
        // Ignore unique constraint violations (concurrent dedup)
        if (err?.code === '23505') return;
        console.error('❌ Erro ao persistir mensagem WA:', err?.message || err);
    }
}

redisSub.on('message', async (channel, message) => {
    console.log(`[Redis SUB] Recebido no canal ${channel}: ${message.substring(0, 100)}...`);
    if (channel === 'channel:bot_events') {
        try {
            const data = JSON.parse(message);

            // Broadcast raw brain event to frontend (non-prospecting events)
            let handledByProspect = false;

            if (data.type === 'message.received') {
                // Phase 8: Intent from Rust Brain is handed to prospect if the Brain explicitly marks it as prospecting
                if (data.mode === 'prospecting') {
                    handledByProspect = await prospectAiService.handleIncomingMessage(data);
                }
            }

            if (handledByProspect) {
                // Pipeline already emitted its own enriched brain event via broadcast
                // Only broadcast the raw event for non-prospect messages
                console.log(`[Redis] Prospect pipeline handled message from ${data.phone}`);
            } else {
                // Not a prospect — broadcast raw event + send generic LLM response
                broadcast('feed.message', data);

                if (data.llm_response) {
                    redisPub.publish('channel:crm_to_bot', JSON.stringify({
                        type: 'message.send',
                        phone: data.phone,
                        text: data.llm_response,
                        tenantId: data.tenantId
                    }));
                }
            }
        } catch (e) {
            console.error('Failed to parse Dolphin event', e);
        }
    } else if (channel === 'channel:wa_messages') {
        try {
            const data = JSON.parse(message);
            await persistWaMessage(data);
        } catch (e) {
            console.error('Failed to parse WA message event', e);
        }
    }
});

// ─── CORS Headers ───────────────────────────────────────────
function corsHeaders(): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

// ─── Route Matcher ──────────────────────────────────────────
type RouteHandler = (req: Request, params: Record<string, string>) => Promise<Response> | Response;
type RouteMap = Map<string, RouteHandler>;

function createRouter() {
    const routes: { method: string; pattern: RegExp; keys: string[]; handler: RouteHandler }[] = [];

    function addRoute(method: string, path: string, handler: RouteHandler) {
        const keys: string[] = [];
        const pattern = new RegExp(
            '^' + path.replace(/:(\w+)/g, (_, key) => { keys.push(key); return '([^/]+)'; }) + '$'
        );
        routes.push({ method, pattern, keys, handler });
    }

    function match(method: string, pathname: string) {
        for (const route of routes) {
            if (route.method !== method) continue;
            const m = pathname.match(route.pattern);
            if (m) {
                const params: Record<string, string> = {};
                route.keys.forEach((key, i) => { params[key] = m[i + 1]; });
                return { handler: route.handler, params };
            }
        }
        return null;
    }

    return { addRoute, match };
}

const router = createRouter();

// ─── Public Routes ──────────────────────────────────────────
const isPublicPath = (pathname: string) => {
    const publics = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/health'];
    return publics.includes(pathname);
};

// ─── Register All Routes ────────────────────────────────────
function registerRoutes() {
    // Health check
    router.addRoute('GET', '/api/health', () => Response.json({ status: 'ok', timestamp: new Date().toISOString() }));

    // Auth
    for (const [method, path, handler] of authRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Dashboard
    for (const [method, path, handler] of dashboardRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Clients
    for (const [method, path, handler] of clientRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Leads
    for (const [method, path, handler] of leadRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Pipeline
    for (const [method, path, handler] of pipelineRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Tickets
    for (const [method, path, handler] of ticketRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Finance
    for (const [method, path, handler] of financeRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Projects
    for (const [method, path, handler] of projectRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Users
    for (const [method, path, handler] of userRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Team
    for (const [method, path, handler] of teamRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Mentorship
    for (const [method, path, handler] of mentorshipRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Bot
    for (const [method, path, handler] of botRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Documents
    for (const [method, path, handler] of documentRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Audit
    for (const [method, path, handler] of auditRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Campaigns
    for (const [method, path, handler] of campaignRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Systems
    for (const [method, path, handler] of systemRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Ideas
    for (const [method, path, handler] of ideaRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Wiki
    for (const [method, path, handler] of wikiRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Onboarding
    for (const [method, path, handler] of onboardingRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Reports
    for (const [method, path, handler] of reportRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Prospector
    for (const [method, path, handler] of prospectRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Config
    for (const [method, path, handler] of configRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Health Check Services
    for (const [method, path, handler] of healthRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Lead Activities
    for (const [method, path, handler] of leadActivityRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Lead Notes
    for (const [method, path, handler] of leadNoteRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Lead Proposals
    for (const [method, path, handler] of leadProposalRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Proposal Adjustments
    for (const [method, path, handler] of proposalAdjustmentRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Delete Requests
    for (const [method, path, handler] of deleteRequestRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // City Presentations
    for (const [method, path, handler] of cityPresentationRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }

    // Lead Stats & Admin
    for (const [method, path, handler] of leadStatsRoutes) {
        router.addRoute(method as string, path as string, handler as RouteHandler);
    }
}

registerRoutes();

// ─── Bun Server ─────────────────────────────────────────────
const server = Bun.serve({
    port: PORT,
    hostname: '0.0.0.0',
    async fetch(req: Request, server: any) {
        const url = new URL(req.url);
        const pathname = url.pathname;
        console.log(`[${req.method}] ${pathname}`);

        // CORS preflight
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders() });
        }

        // WebSocket upgrade
        if (pathname === '/ws') {
            const token = url.searchParams.get('token');
            if (!token) {
                return new Response('Unauthorized', { status: 401 });
            }
            const payload = await verifyToken(token);
            if (!payload) {
                return new Response('Invalid token', { status: 401 });
            }
            const upgraded = server.upgrade(req, {
                data: {
                    userId: payload.sub,
                    role: payload.role,
                    tenantId: payload.tenantId
                }
            });
            if (upgraded) return undefined;
            return new Response('WebSocket upgrade failed', { status: 400 });
        }

        // Auth check for protected routes
        if (!isPublicPath(pathname)) {
            const authHeader = req.headers.get('Authorization');
            if (!authHeader?.startsWith('Bearer ')) {
                return Response.json({ success: false, error: 'Unauthorized' }, {
                    status: 401, headers: corsHeaders(),
                });
            }
            const payload = await verifyToken(authHeader.slice(7));
            if (!payload) {
                return Response.json({ success: false, error: 'Invalid token' }, {
                    status: 401, headers: corsHeaders(),
                });
            }
            // Attach user info to request
            (req as any)._user = payload;
        }

        // Route matching
        const result = router.match(req.method, pathname);
        if (result) {
            try {
                const response = await result.handler(req, result.params);
                // Add CORS headers
                const headers = new Headers(response.headers);
                Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers,
                });
            } catch (err: any) {
                console.error('Route error:', err);
                return Response.json({ success: false, error: err.message || 'Internal error' }, {
                    status: 500, headers: corsHeaders(),
                });
            }
        }

        return Response.json({ success: false, error: 'Not Found' }, {
            status: 404, headers: corsHeaders(),
        });
    },

    websocket: handleWebSocket,
});

console.log(`🏰 Império Lord API running on http://0.0.0.0:${PORT}`);
console.log(`📡 WebSocket available at ws://0.0.0.0:${PORT}/ws`);
startFollowUpCron();
