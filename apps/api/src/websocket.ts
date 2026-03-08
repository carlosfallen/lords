// ============================================================
// WebSocket Handler — Bun Native
// ============================================================
import { redisPublisher } from './redis';

interface WsData {
    userId: string;
    role: string;
    tenantId?: string | null;
}

export const wsClients = new Map<string, any>();

export const handleWebSocket = {
    open(ws: any) {
        const data = ws.data as WsData;
        wsClients.set(data.userId, ws);
        console.log(`📡 WebSocket connected: ${data.userId} (${data.role})`);

        // Send initial connection confirmation
        ws.send(JSON.stringify({
            type: 'auth',
            data: { status: 'connected', userId: data.userId },
        }));
    },

    message(ws: any, message: string | Buffer) {
        try {
            const msg = JSON.parse(typeof message === 'string' ? message : message.toString());

            if (msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                return;
            }

            // Route bot.action messages to Redis for Go gateway processing
            if (msg.type === 'bot.action' && msg.data) {
                if (redisPublisher) {
                    redisPublisher.publish('channel:crm_to_bot', JSON.stringify({
                        type: msg.data.type, // 'message.send' | 'bot.takeover' | 'bot.resume'
                        phone: msg.data.phone,
                        text: msg.data.text,
                        tenantId: (ws.data as WsData).tenantId,
                    }));
                }
                return;
            }

            console.log(`📨 WS message from ${(ws.data as WsData).userId}:`, msg.type);
        } catch (err) {
            console.error('WS message parse error:', err);
        }
    },

    close(ws: any) {
        const data = ws.data as WsData;
        wsClients.delete(data.userId);
        console.log(`📡 WebSocket disconnected: ${data.userId}`);
    },

    drain(ws: any) {
        // Backpressure relief
    },
};

// ─── Broadcast with Tenant Isolation ────────────────────────
export function broadcast(event: string, data: unknown, options?: { targetRole?: string; targetTenantId?: string | null }) {
    const message = JSON.stringify({ type: event, data, timestamp: Date.now() });
    const { targetRole, targetTenantId } = options || {};

    for (const [, ws] of wsClients) {
        try {
            const clientData = ws.data as WsData;

            // 1. Check Tenant Isolation (Critical)
            if (targetTenantId && clientData.tenantId !== targetTenantId) {
                continue;
            }

            // 2. Check Role Authorization
            if (targetRole && clientData.role !== targetRole) {
                continue;
            }

            ws.send(message);
        } catch (err) {
            // Client likely disconnected
        }
    }
}

// ─── Send to specific user ─────────────────────────────────
export function sendToUser(userId: string, event: string, data: unknown) {
    const ws = wsClients.get(userId);
    if (ws) {
        try {
            ws.send(JSON.stringify({ type: event, data, timestamp: Date.now() }));
        } catch (err) {
            wsClients.delete(userId);
        }
    }
}
