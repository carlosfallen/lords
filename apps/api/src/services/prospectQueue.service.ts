// ============================================================
// Prospecting Queue Worker — Now uses Response Engine
// Processes leads sequentially, generates AI first messages
// ============================================================
import { db, prospectQueues, prospectCampaigns, leads } from 'db';
import { eq } from 'drizzle-orm';
import { prospectResponseEngine } from './prospectResponseEngine.service';

class ProspectQueueWorker {
    private timer: any = null;
    private running = false;
    private processing = false; // Prevent overlapping processNext calls

    start() {
        if (this.running) return;
        this.running = true;
        this.timer = setInterval(this.processNext.bind(this), 10000);
        console.log('🚀 Prospector Queue Worker started (AI-powered).');
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        if (this.timer) clearInterval(this.timer);
        console.log('🛑 Prospector Queue Worker stopped.');
    }

    get isRunning() {
        return this.running;
    }

    async processNext() {
        if (!this.running || this.processing) return;
        this.processing = true;

        try {
            // Find next pending queue item
            const pendingItems = await db.select().from(prospectQueues)
                .where(eq(prospectQueues.status, 'pending'))
                .limit(1);

            if (pendingItems.length === 0) {
                this.processing = false;
                return;
            }
            const item = pendingItems[0];
            const newAttempts = (item.attempts || 0) + 1;

            // Mark as processing and increment attempt count BEFORE generation
            await db.update(prospectQueues).set({
                status: 'processing' as const,
                attempts: newAttempts
            }).where(eq(prospectQueues.id, item.id));

            // Fetch the REAL CRM lead
            const [lead] = await db.select().from(leads).where(eq(leads.id, item.contactId)).limit(1);

            if (!lead || !lead.phone) {
                await db.update(prospectQueues).set({
                    status: 'failed' as const,
                    lastError: 'Lead not found or no phone number'
                }).where(eq(prospectQueues.id, item.id));
                this.processing = false;
                return;
            }

            console.log(`[Prospector] Generating AI first message for ${lead.phone} (${lead.name})...`);

            try {
                // Use the Response Engine to generate the first AI-powered message
                const result = await prospectResponseEngine.generateFirstMessage(lead.id, item.campaignId);

                // Message was sent successfully. Update status to waiting for lead response.
                await db.update(prospectQueues).set({
                    status: 'waiting_response' as const,
                    lastError: null
                }).where(eq(prospectQueues.id, item.id));

                console.log(`[Prospector] ✅ Sent AI first message to ${lead.phone}: "${result.text.substring(0, 60)}..."`);

            } catch (genError: any) {
                console.error(`[Prospector] ❌ AI generation failed for ${lead.phone}:`, genError?.message);

                // Mark as failed if max reached, otherwise pending for retry
                if (newAttempts >= (item.maxAttempts || 3)) {
                    await db.update(prospectQueues).set({
                        status: 'failed' as const,
                        lastError: `AI generation failed: ${genError?.message || 'Unknown error'}`,
                    }).where(eq(prospectQueues.id, item.id));
                } else {
                    // Return to pending for retry
                    await db.update(prospectQueues).set({
                        status: 'pending' as const,
                        lastError: `Attempt ${newAttempts} failed: ${genError?.message || 'Unknown error'}`,
                    }).where(eq(prospectQueues.id, item.id));
                }
            }

        } catch (e: any) {
            console.error('[Prospector Queue Worker Error]', e?.message || e);
        } finally {
            this.processing = false;
        }
    }
}

export const queueWorker = new ProspectQueueWorker();
