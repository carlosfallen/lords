// ============================================================
// Bot Routes — Proxy to Go Gateway + Database Queries
// ============================================================
import { db, botSessions, leads, leadConversations } from 'db';
import { eq, desc, sql, and, count } from 'drizzle-orm';
import { redisPublisher } from '../redis';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://lords-bot-gateway:8080';

async function proxyGateway(path: string): Promise<any> {
    const res = await fetch(`${GATEWAY_URL}${path}`, { signal: AbortSignal.timeout(5000) });
    return res.json();
}

export const botRoutes: RouteEntry[] = [
    ['GET', '/api/bot/status', async () => {
        try {
            // Try real gateway first
            const gwData = await proxyGateway('/status');

            // Count today's conversations from DB
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const todayIso = today.toISOString();
            const [convCount] = await db.select({ total: count() }).from(leadConversations)
                .where(sql`${leadConversations.createdAt} >= ${todayIso}`);

            return Response.json({
                success: true,
                data: {
                    status: gwData?.data?.status || 'disconnected',
                    phoneNumber: gwData?.data?.phoneNumber || '',
                    uptime: '0h',
                    totalConversationsToday: Number(convCount?.total || 0),
                },
            });
        } catch {
            // Gateway unreachable — fallback to DB
            return Response.json({
                success: true,
                data: { status: 'disconnected', phoneNumber: '', uptime: '0h', totalConversationsToday: 0 },
            });
        }
    }],

    ['GET', '/api/bot/conversations', async () => {
        // Only get leads that have at least 1 WhatsApp message (separates CRM leads from WA conversations)
        const leadsWithMessages = await db.select({
            id: leads.id,
            contactName: leads.name,
            contactPhone: leads.phone,
            temperature: leads.temperature,
            source: leads.source,
            niche: leads.niche,
            createdAt: leads.createdAt,
        }).from(leads)
            .where(and(
                eq(leads.isConverted, false),
                sql`EXISTS (SELECT 1 FROM lead_conversations WHERE lead_conversations.lead_id = ${leads.id})`
            ))
            .orderBy(desc(leads.updatedAt));

        // For each lead with messages, get latest message and unread count
        const conversations = await Promise.all(leadsWithMessages.map(async (lead) => {
            const [latest] = await db.select().from(leadConversations)
                .where(eq(leadConversations.leadId, lead.id))
                .orderBy(desc(leadConversations.createdAt))
                .limit(1);

            const [unread] = await db.select({ total: count() }).from(leadConversations)
                .where(and(eq(leadConversations.leadId, lead.id), eq(leadConversations.isRead, false)));

            return {
                ...lead,
                trail: 'sale',
                currentStage: 'Recepção',
                lastMessage: latest?.content || '',
                lastMessageAt: latest?.createdAt || lead.createdAt,
                unreadCount: Number(unread?.total || 0),
                isHumanTakeover: latest?.senderType === 'human',
            };
        }));

        // Sort by last message time
        conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

        return Response.json({ success: true, data: conversations });
    }],

    ['GET', '/api/bot/conversations/:id/messages', async (_, params) => {
        const [lead] = await db.select({
            id: leads.id,
            name: leads.name,
            phone: leads.phone,
            productOfInterest: leads.productOfInterest,
            niche: leads.niche,
            metadata: leads.metadata,
        }).from(leads).where(eq(leads.id, params.id)).limit(1);

        if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        const messages = await db.select({
            id: leadConversations.id,
            leadId: leadConversations.leadId,
            direction: leadConversations.direction,
            senderType: leadConversations.senderType,
            messageType: leadConversations.messageType,
            content: leadConversations.content,
            mediaUrl: leadConversations.mediaUrl,
            intent: leadConversations.intent,
            isRead: leadConversations.isRead,
            createdAt: leadConversations.createdAt,
        }).from(leadConversations)
            .where(eq(leadConversations.leadId, params.id))
            .orderBy(leadConversations.createdAt);

        // Mark as read
        await db.update(leadConversations)
            .set({ isRead: true })
            .where(and(eq(leadConversations.leadId, params.id), eq(leadConversations.isRead, false)));

        // Return full structure expected by ChatView.tsx
        return Response.json({
            success: true,
            data: {
                ...lead,
                contact: {
                    id: lead.id,
                    name: lead.name || lead.phone,
                    phone: lead.phone,
                    company: lead.productOfInterest || '—',
                    city: lead.niche || '—',
                },
                messages: messages.map(m => ({
                    ...m,
                    // Map field names to match frontend expectations if necessary (camelCase to snake_case if forced)
                    // The frontend seems to use snake_case in types/index.ts for Message
                    conversation_id: m.leadId,
                    sender_type: m.senderType,
                    message_type: m.messageType,
                    media_url: m.mediaUrl,
                    sent_at: m.createdAt,
                })),
                bot_active: (lead.metadata as any)?.botActive ? 1 : 0,
                step: (lead.metadata as any)?.step || 0,
            }
        });
    }],

    ['POST', '/api/bot/conversations/:id/send', async (req, params) => {
        const { content } = await req.json();

        const [msg] = await db.insert(leadConversations).values({
            leadId: params.id,
            direction: 'outbound',
            senderType: 'human',
            messageType: 'text',
            content,
            isRead: true,
        }).returning();

        // Update lead last contact
        await db.update(leads).set({ lastContactAt: new Date(), updatedAt: new Date() })
            .where(eq(leads.id, params.id));

        // Publish to bot-bridge
        const [targetLead] = await db.select().from(leads).where(eq(leads.id, params.id)).limit(1);
        if (targetLead) {
            await redisPublisher.publish('channel:crm_to_bot', JSON.stringify({
                type: 'message.send',
                phone: targetLead.phone,
                text: content,
                tenantId: targetLead.tenantId,
            }));
        }

        return Response.json({ success: true, data: msg });
    }],

    ['POST', '/api/bot/conversations/:id/takeover', async (_, params) => {
        const [targetLead] = await db.select().from(leads).where(eq(leads.id, params.id)).limit(1);
        if (!targetLead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        // Persist botActive state in metadata so it survives page reloads
        const currentMeta = (targetLead.metadata as any) || {};
        const newBotActive = !currentMeta.botActive; // Toggle: if bot was active, human takes over and vice versa
        await db.update(leads).set({
            metadata: { ...currentMeta, botActive: newBotActive },
            updatedAt: new Date(),
        }).where(eq(leads.id, params.id));

        // Publish takeover signal to bot-bridge
        await redisPublisher.publish('channel:crm_to_bot', JSON.stringify({
            type: newBotActive ? 'bot.resume' : 'bot.takeover',
            phone: targetLead.phone,
            tenantId: targetLead.tenantId,
        }));

        return Response.json({ success: true, data: { leadId: params.id, botActive: newBotActive } });
    }],

    ['POST', '/api/bot/conversations/:id/complete', async (req, params) => {
        const { result } = await req.json();
        const [targetLead] = await db.select().from(leads).where(eq(leads.id, params.id)).limit(1);
        if (!targetLead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

        const currentMeta = (targetLead.metadata as any) || {};
        const updates: any = {
            metadata: { ...currentMeta, result, endedAt: new Date().toISOString(), botActive: false },
            updatedAt: new Date(),
        };

        // Mark as converted for positive outcomes
        if (result === 'meeting_scheduled') {
            updates.isConverted = true;
        }

        await db.update(leads).set(updates).where(eq(leads.id, params.id));

        return Response.json({ success: true, data: { leadId: params.id, result } });
    }],

    ['GET', '/api/bot/metrics', async () => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayIso = today.toISOString();
        const [todayMsgs] = await db.select({ total: count() }).from(leadConversations)
            .where(sql`${leadConversations.createdAt} >= ${todayIso}`);

        const [botMsgs] = await db.select({ total: count() }).from(leadConversations)
            .where(and(eq(leadConversations.senderType, 'bot'), sql`${leadConversations.createdAt} >= ${todayIso}`));

        const [humanMsgs] = await db.select({ total: count() }).from(leadConversations)
            .where(and(eq(leadConversations.senderType, 'human'), sql`${leadConversations.createdAt} >= ${todayIso}`));

        return Response.json({
            success: true,
            data: {
                totalMessagesToday: Number(todayMsgs?.total || 0),
                botMessages: Number(botMsgs?.total || 0),
                humanMessages: Number(humanMsgs?.total || 0),
                automationRate: (todayMsgs?.total || 0) > 0
                    ? Math.round(((botMsgs?.total || 0) / Number(todayMsgs?.total || 1)) * 100) : 0,
            },
        });
    }],

    ['GET', '/api/bot/health', async () => {
        const [bot] = await db.select().from(botSessions).limit(1);
        return Response.json({
            success: true,
            data: {
                status: bot?.status || 'disconnected',
                instanceName: bot?.instanceName,
                uptime: bot?.uptimeSeconds || 0,
                connectedAt: bot?.connectedAt,
            },
        });
    }],

    ['GET', '/api/bot/qrcode', async () => {
        try {
            const gwData = await proxyGateway('/qr');
            // Always return 200 so frontend can handle the response
            return Response.json(gwData);
        } catch {
            return Response.json({
                success: false,
                error: 'Gateway não está acessível. Verifique se o serviço bot-gateway-go está rodando.',
            }, { status: 503 });
        }
    }],

    ['POST', '/api/bot/disconnect', async () => {
        try {
            const gwData = await proxyGateway('/disconnect');
            return Response.json(gwData);
        } catch {
            return Response.json({ success: false, error: 'Gateway não acessível' }, { status: 503 });
        }
    }],

    ['POST', '/api/bot/reconnect', async () => {
        try {
            const gwData = await proxyGateway('/reconnect');
            return Response.json(gwData);
        } catch {
            return Response.json({ success: false, error: 'Gateway não acessível' }, { status: 503 });
        }
    }],
];
