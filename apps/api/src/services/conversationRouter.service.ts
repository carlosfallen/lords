// ================================================================
// Conversation Router — Playbook v1.0
// Routes incoming lead messages to the correct handler:
//   - 'human'       → ignored (human agent handles manually)
//   - 'prospecting' → ProspectAiService (our pipeline, no Rust Brain)
//   - 'support'     → Rust Brain (LLM via Gateway)
//
// IMPORTANT: Prospecting mode is handled DIRECTLY here, without
// routing through the Rust Brain, because:
//   1. The Bot has its own LLM pipeline (prospectResponseEngine)
//   2. Avoiding the round-trip eliminates a critical failure point
//   3. The Rust Brain is only needed for generic support conversations
// ================================================================

import { db, leads } from 'db';
import { eq } from 'drizzle-orm';
import { prospectAiService } from './prospectAi.service';

export type ConversationMode = 'human' | 'support' | 'prospecting';

export class ConversationRouterService {
    async routeMessage(
        leadId: string,
        phone: string,
        text: string,
        msgId: string,
        timestamp: number,
        tenantId: string,
    ) {
        // 1. Fetch Lead Metadata
        const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
        if (!lead) return;

        const metadata = (lead.metadata as any) || {};

        // 2. Determine conversation mode
        //    Priority: botActive=false → HUMAN wins unconditionally
        let mode: ConversationMode;

        if (metadata.botActive === false) {
            mode = 'human';
        } else {
            // Check root-level mode first (set by the engine on every state transition)
            const rootMode = metadata.conversationMode;

            if (rootMode === 'prospecting') {
                mode = 'prospecting';
            } else if (rootMode === 'human') {
                mode = 'human';
            } else if (rootMode === 'support') {
                mode = 'support';
            } else {
                // Legacy / unset: check prospecting sub-object
                const p = metadata.prospecting;
                const isActiveProspect = p && (
                    p.isActive === true ||
                    p.isProspecting === true ||
                    p.conversationMode === 'prospecting' ||
                    p.conversationMode === 'outbound_prospecting'
                );
                mode = isActiveProspect ? 'prospecting' : 'support';
            }
        }

        console.log(`[Router] Lead ${leadId} (${phone}) → mode: ${mode}`);

        // 3. Route by mode
        if (mode === 'human') {
            // Human agent is handling — bot stays silent
            console.log(`[Router] Human mode — ignoring bot response for ${phone}`);
            return;
        }

        if (mode === 'prospecting') {
            // ──────────────────────────────────────────────────────────────
            // DIRECT PIPELINE — no Rust Brain round-trip needed
            // The prospectAiService runs the full Response Engine internally
            // ──────────────────────────────────────────────────────────────
            console.log(`[Router] Prospecting mode — dispatching to ProspectAI pipeline for ${phone}`);
            const handled = await prospectAiService.handleDirectMessage(
                leadId,
                phone,
                text,
                msgId,
                timestamp,
            );
            if (!handled) {
                console.warn(`[Router] ProspectAI returned false for ${phone} — possibly not active prospect anymore`);
            }
            return;
        }

        // mode === 'support' → send to Rust Brain via Gateway
        await this.dispatchToGateway(phone, text, msgId, timestamp, tenantId, 'support');
    }

    private async dispatchToGateway(
        phone: string,
        text: string,
        msgId: string,
        timestamp: number,
        tenantId: string,
        mode: string,
    ) {
        try {
            const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8080';
            const suffixedTenantId = `${tenantId}|${mode}`;

            await fetch(`${gatewayUrl}/api/brain/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phoneId: phone + '@s.whatsapp.net',
                    text,
                    timestamp,
                    messageId: msgId,
                    tenantId: suffixedTenantId,
                }),
            });

            console.log(`[Router] Dispatched to Rust Brain (${mode}) for ${phone}`);
        } catch (e: any) {
            console.error(`[Router] Failed to reach Gateway:`, e?.message || e);
        }
    }
}

export const conversationRouterService = new ConversationRouterService();
