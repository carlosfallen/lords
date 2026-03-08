// ================================================================
// Prospecting AI Service — Playbook v1.0
// Entry point for the Response Engine pipeline
//
// Two entry points:
//   handleDirectMessage()  → called by ConversationRouter (has leadId)
//   handleIncomingMessage() → called by Redis bot_events (legacy/Rust Brain path)
//
// CRITICAL: Uses a per-phone processing lock to prevent duplicate
// pipeline executions when rapid sequential messages arrive.
// The consolidation window batches messages; the lock ensures only
// ONE pipeline run happens per batch.
// ================================================================

import { db, leads } from 'db';
import { eq } from 'drizzle-orm';
import { prospectResponseEngine } from './prospectResponseEngine.service';
import { consolidateMessages } from './prospectConversationState.service';
import { extractProspectingStateAsync } from './prospectStateExtractor.service';
import { classifyUnderstanding } from './prospectStrategyBank';

// ─── Per-phone processing lock ────────────────────────────────
// Prevents multiple pipeline executions for the same lead when
// rapid messages arrive (e.g. "opa" + "boa noite" + "pode dizer")
// consolidateMessages() batches them → only ONE execution runs
const processingLock = new Set<string>();

// How long to lock after a reply is dispatched (prevents re-entry
// from delayed webhooks while the pipeline is still writing)
const LOCK_DURATION_AFTER_REPLY_MS = 4000;

export class ProspectAiService {

    // ─── Primary path: called directly by ConversationRouter ─────
    async handleDirectMessage(
        leadId: string,
        phone: string,
        text: string,
        _msgId: string,
        _timestamp: number,
    ): Promise<boolean> {
        if (!leadId || !text) return false;

        // Step 1: Consolidate rapid messages (2.5s debounce window)
        // All 3 messages ("opa", "boa noite", "pode dizer") resolve together
        const consolidatedText = await consolidateMessages(phone, text);

        // Step 2: Acquire per-phone lock
        // If another call already acquired the lock (same batch), skip
        if (processingLock.has(phone)) {
            console.log(`[ProspectAI] Lock held for ${phone} — skipping duplicate pipeline call`);
            return false;
        }
        processingLock.add(phone);

        try {
            // Step 3: Verify lead is still an active prospect (guard)
            const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
            if (!lead) return false;

            const meta = (lead.metadata as any) || {};
            const p = meta.prospecting;

            const isActive = p && (p.isActive === true || p.isProspecting === true);
            if (!isActive) {
                console.log(`[ProspectAI] Lead ${phone} is no longer an active prospect — skip`);
                return false;
            }

            const currentState = p.conversationState || p.funnelPhase || 'S1_WAITING_OPENING_REPLY';
            console.log(`[ProspectAI] ▶ ${phone} | State: ${currentState} | Consolidated: "${consolidatedText.substring(0, 60)}"`);

            return await this._runPipeline(lead, consolidatedText, 'intent.desconhecido', 0);

        } finally {
            // Hold the lock briefly after reply to absorb any duplicate webhook deliveries
            setTimeout(() => processingLock.delete(phone), LOCK_DURATION_AFTER_REPLY_MS);
        }
    }

    // ─── Secondary path: from Redis bot_events (Rust Brain) ──────
    async handleIncomingMessage(data: any): Promise<boolean> {
        if (!data || data.type !== 'message.received') return false;

        const inputPhone = data.phone || '';
        const phone = inputPhone.split('@')[0];
        const text = data.text;
        const intent = data.intent || 'intent.desconhecido';
        const confidence = data.confidence || 0;

        if (!phone || !text) return false;

        // Skip if already being handled by the direct path
        if (processingLock.has(phone)) {
            console.log(`[ProspectAI] Lock held for ${phone} — skipping Brain event (direct path already running)`);
            return false;
        }

        const [lead] = await db.select().from(leads)
            .where(eq(leads.phone, phone))
            .limit(1);

        if (!lead) return false;

        const meta = (lead.metadata as any) || {};
        const p = meta.prospecting;
        const isActive = p && (p.isProspecting === true || p.isActive === true);
        if (!isActive) return false;

        console.log(`[ProspectAI] Brain event for ${phone}`);
        const consolidatedText = await consolidateMessages(phone, text);

        if (processingLock.has(phone)) {
            console.log(`[ProspectAI] Lock acquired while consolidating for ${phone} — skip`);
            return false;
        }

        processingLock.add(phone);
        try {
            return await this._runPipeline(lead, consolidatedText, intent, confidence);
        } finally {
            setTimeout(() => processingLock.delete(phone), LOCK_DURATION_AFTER_REPLY_MS);
        }
    }

    // ─── Shared pipeline execution ────────────────────────────────
    private async _runPipeline(
        lead: any,
        consolidatedText: string,
        intent: string,
        confidence: number,
    ): Promise<boolean> {
        const phone = lead.phone;

        try {
            // Re-read fresh state (metadata may have changed during consolidation window)
            const [freshLead] = await db.select().from(leads).where(eq(leads.id, lead.id)).limit(1);
            const freshMeta = (freshLead?.metadata as any) || {};
            const freshState = freshMeta.prospecting?.conversationState || 'S1_WAITING_OPENING_REPLY';

            // Classify understanding for observability
            const understanding = classifyUnderstanding(consolidatedText, freshState);
            console.log(`[ProspectAI] Understanding: ${understanding} | State: ${freshState}`);

            // Run the full Response Engine pipeline
            const result = await prospectResponseEngine.handleReply(
                lead.id,
                consolidatedText,
                intent,
                confidence,
            );

            console.log(`[ProspectAI] ✅ ${phone}: state=${result.conversationState} | strategy=${result.strategy.microStrategy} | sent=${result.sent}`);

            // Async state extraction (non-blocking)
            extractProspectingStateAsync(lead.id).catch(err => {
                console.warn(`[ProspectAI] Extraction failed for ${phone}:`, err?.message);
            });

            return result.sent;

        } catch (e: any) {
            console.error(`[ProspectAI] ❌ Pipeline failed for ${phone}:`, e?.message || e);
            return false;
        }
    }
}

export const prospectAiService = new ProspectAiService();
