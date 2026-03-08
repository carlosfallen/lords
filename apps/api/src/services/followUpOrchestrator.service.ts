// ================================================================
// Follow-Up Orchestrator — Playbook v1.0
// Implements: Section 15 — Follow-Up Orchestration
// Decides if/when to send follow-up, selects angle, blocks repetition
// ================================================================

import { db, leads, leadConversations } from 'db';
import { eq, and, lt, isNull, desc } from 'drizzle-orm';
import type { ProspectingState } from './prospectConversationState.service';
import { loadProspectingState, saveProspectingState } from './prospectConversationState.service';
import { MESSAGE_TEMPLATES } from './prospectSemanticBank';

// ─── Follow-up Configuration ─────────────────────────────────

// Interval between follow-ups (in hours)
const FOLLOWUP_INTERVALS_HOURS = [24, 48, 72, 96]; // 1, 2, 3, 4 days

// Max follow-ups per stage
const MAX_OPENING_FOLLOWUPS = 4;  // FU_OPEN_1 → FU_OPEN_4
const MAX_ROUTE_A_FOLLOWUPS = 5;  // NR_PERSIST_1 → NR_PERSIST_5
const MAX_ROUTE_B_FOLLOWUPS = 5;  // 5 different angles

// Route B warm-up angles (section 15.3)
const ROUTE_B_ANGLES = [
    'taxa_margin',       // angle 1: taxa/margem
    'own_channel',       // angle 2: canal próprio
    'order_control',     // angle 3: controle/pedido organizado
    'short_meeting',     // angle 4: reunião curta
    'final_attempt',     // angle 5: última retomada objetiva
];

// Route B follow-up messages by angle
const ROUTE_B_FOLLOWUP_MESSAGES: Record<string, string> = {
    taxa_margin: 'E na operação de vocês, quanto fica perdendo em taxa por mês por depender de terceiros?',
    own_channel: 'Um canal próprio significa que o pedido cai direto no caixa de vocês, sem desconto de plataforma. Faz sentido querer entender como funciona?',
    order_control: 'Quando os pedidos chegam por vários canais, o controle fica difícil. A ideia é centralizar isso num canal próprio sem taxa. Posso te mostrar?',
    short_meeting: 'Não precisaria de muito tempo. Em 15 minutos você já entende se faz sentido ou não pra operação de vocês. Tem um horário esses dias?',
    final_attempt: 'Só passando pra saber se esse assunto ficou em aberto ou se já não é prioridade por aí. Se quiser retomar, é só falar.',
};

// ─── Check if Should Send Follow-up ──────────────────────────
export async function shouldSendFollowup(leadId: string): Promise<{
    should: boolean;
    templateId: string | null;
    message: string | null;
    reason: string;
}> {
    try {
        const { state } = await loadProspectingState(leadId);

        // Terminal states: never follow up
        if (['RA_CONTACT_CAPTURED', 'RB_MEETING_CONFIRMED', 'SX_BLOCKED', 'SX_NOT_INTERESTED', 'SX_NO_RESPONSE'].includes(state.conversationState)) {
            return { should: false, templateId: null, message: null, reason: 'terminal_state' };
        }

        // If thread should close, don't follow up
        if (state.shouldCloseCurrentThread) {
            return { should: false, templateId: null, message: null, reason: 'thread_closed' };
        }

        // Check if enough time has passed since last contact
        if (state.lastContactAt) {
            const hoursSinceContact = (Date.now() - new Date(state.lastContactAt).getTime()) / (1000 * 60 * 60);
            const requiredInterval = FOLLOWUP_INTERVALS_HOURS[Math.min(state.followupStage, FOLLOWUP_INTERVALS_HOURS.length - 1)];

            if (hoursSinceContact < requiredInterval) {
                return { should: false, templateId: null, message: null, reason: `too_soon (${hoursSinceContact.toFixed(1)}h < ${requiredInterval}h required)` };
            }
        }

        // Determine follow-up based on current state (Section 15)
        const result = await decideFollowupMessage(state);
        return result;

    } catch (e: any) {
        console.error(`[FollowUpOrchestrator] Error checking follow-up for ${leadId}:`, e?.message);
        return { should: false, templateId: null, message: null, reason: 'error' };
    }
}

// ─── Decide Follow-up Message ─────────────────────────────────
async function decideFollowupMessage(state: ProspectingState): Promise<{
    should: boolean;
    templateId: string | null;
    message: string | null;
    reason: string;
}> {

    // Case 1: Opening with no reply (Section 15 — "Abertura sem resposta")
    if (state.conversationState === 'S1_WAITING_OPENING_REPLY' || state.conversationState === 'S0_OPENING') {
        if (state.followupStage >= MAX_OPENING_FOLLOWUPS) {
            return { should: false, templateId: 'SX_NO_RESPONSE', message: null, reason: 'opening_followup_limit_reached' };
        }

        const stage = state.followupStage + 1;
        const templateId = `FU_OPEN_${stage}`;
        const message = MESSAGE_TEMPLATES[templateId];

        if (!message) {
            return { should: false, templateId: null, message: null, reason: 'no_template_found' };
        }

        return { should: true, templateId, message, reason: 'opening_followup' };
    }

    // Case 2: Route A — waiting for contact without cooperation (Section 15 — "Rota A sem cooperação")
    if (state.conversationState === 'RA_WAITING_CONTACT_INFO' || state.conversationState === 'RA_NON_RESPONSIBLE') {
        if (state.followupStage >= MAX_ROUTE_A_FOLLOWUPS) {
            return { should: false, templateId: 'SX_BLOCKED', message: null, reason: 'route_a_followup_limit_reached' };
        }

        const stage = state.followupStage + 1;
        const templateId = `NR_PERSIST_${stage}`;
        const message = MESSAGE_TEMPLATES[templateId];

        if (!message) {
            return { should: false, templateId: null, message: null, reason: 'no_persist_template' };
        }

        return { should: true, templateId, message, reason: 'route_a_persistence' };
    }

    // Case 3: Route B — responsible person is cold (Section 15 — "Rota B com responsável frio")
    if (['RB_RESPONSIBLE', 'RB_CHANNEL_DIAGNOSIS', 'RB_PAIN_CLARIFICATION', 'RB_VALUE_PRESENTED', 'RB_MEETING_PROPOSED'].includes(state.conversationState)) {
        if (state.followupStage >= MAX_ROUTE_B_FOLLOWUPS) {
            return { should: false, templateId: null, message: null, reason: 'route_b_followup_limit_reached' };
        }

        const angle = ROUTE_B_ANGLES[state.followupStage] || 'final_attempt';
        const message = ROUTE_B_FOLLOWUP_MESSAGES[angle];
        const templateId = `RB_FOLLOWUP_${angle.toUpperCase()}`;

        if (!message) {
            return { should: false, templateId: null, message: null, reason: 'no_route_b_angle' };
        }

        return { should: true, templateId, message, reason: `route_b_angle_${angle}` };
    }

    return { should: false, templateId: null, message: null, reason: 'no_applicable_followup_rule' };
}

// ─── Record Follow-up Sent ────────────────────────────────────
export async function recordFollowupSent(leadId: string, templateId: string): Promise<void> {
    const { state } = await loadProspectingState(leadId);
    state.followupStage += 1;
    state.lastFollowupSentAt = new Date().toISOString();
    state.lastContactAt = new Date().toISOString();
    state.lastMessageTemplateId = templateId;
    await saveProspectingState(leadId, state);
    console.log(`[FollowUpOrchestrator] Follow-up stage ${state.followupStage} sent for ${leadId} (template: ${templateId})`);
}

// ─── Check if Lead is Eligible for Follow-up ─────────────────
export function isFollowupEligible(state: ProspectingState): boolean {
    // Section 16 — Healthy persistence
    // Lead has not closed the door
    // Has not explicitly said not interested (twice)
    // Has not blocked

    const blockedStates = ['RA_CONTACT_CAPTURED', 'RB_MEETING_CONFIRMED', 'SX_BLOCKED', 'SX_NOT_INTERESTED', 'SX_NO_RESPONSE'];
    if (blockedStates.includes(state.conversationState)) return false;

    if (state.shouldCloseCurrentThread) return false;

    // Don't follow up if they've confirmed disinterest
    if (state.conversationOutcome === 'not_interested') return false;
    if (state.conversationOutcome === 'blocked') return false;

    return true;
}

// ─── Cron-like Runner for Active Prospects ───────────────────
export async function runFollowupOrchestrator(): Promise<void> {
    try {
        // Find active prospecting leads with pending follow-up needs
        const activeLeads = await db.select({
            id: leads.id,
            metadata: leads.metadata,
            lastContactAt: leads.lastContactAt,
        }).from(leads)
            .where(
                and(
                    eq(leads.status, 'ativo'),
                )
            )
            .limit(50);

        let followupsSent = 0;

        for (const lead of activeLeads) {
            const meta = (lead.metadata as any) || {};
            const prospecting = meta.prospecting;

            if (!prospecting?.isProspecting && !prospecting?.isActive) continue;

            const result = await shouldSendFollowup(lead.id);

            if (result.should && result.message) {
                // Dispatch follow-up via Redis
                try {
                    const { redisPublisher } = await import('../redis');
                    const [fullLead] = await db.select().from(leads).where(eq(leads.id, lead.id)).limit(1);

                    if (!fullLead?.phone) continue;

                    let cleanPhone = fullLead.phone.replace(/\D/g, '');
                    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                        cleanPhone = `55${cleanPhone}`;
                    }

                    const tenantId = fullLead.tenantId || process.env.TENANT_ID || 'default';

                    // Persist to conversation history
                    await db.insert(leadConversations).values({
                        leadId: lead.id,
                        direction: 'outbound',
                        senderType: 'bot',
                        messageType: 'text',
                        content: result.message,
                        isRead: true,
                    });

                    // Publish to WhatsApp
                    await redisPublisher.publish('channel:crm_to_bot', JSON.stringify({
                        type: 'message.send',
                        phone: cleanPhone,
                        text: result.message,
                        tenantId,
                        leadId: lead.id,
                    }));

                    // Record the follow-up
                    await recordFollowupSent(lead.id, result.templateId || 'FOLLOWUP_MANUAL');
                    followupsSent++;

                    console.log(`[FollowUpOrchestrator] ✅ Sent follow-up to ${cleanPhone} (${lead.id}) - ${result.reason}`);

                    // Small delay between sends
                    await new Promise(r => setTimeout(r, 500));

                } catch (sendError: any) {
                    console.error(`[FollowUpOrchestrator] Failed to send follow-up for ${lead.id}:`, sendError?.message);
                }
            }
        }

        if (followupsSent > 0) {
            console.log(`[FollowUpOrchestrator] Batch complete: ${followupsSent} follow-ups sent`);
        }

    } catch (e: any) {
        console.error(`[FollowUpOrchestrator] Runner error:`, e?.message);
    }
}
