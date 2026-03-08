// ================================================================
// Human Pacing Service — Playbook v1.0 Adendo Técnico
// Implements: Sections 3–23 (Cadência Humana, Typing, Rate Limit)
//
// Purpose:
//   1. Make bot responses feel natural (not robotic)
//   2. Prevent WhatsApp spam flags
//   3. Enforce per-phone rate limits and opt-out suppression
//   4. Track pacing metadata for observability
// ================================================================

import crypto from 'crypto';

// ─── Types ───────────────────────────────────────────────────

export type OptOutStatus = 'active' | 'opted_out' | 'unknown';

export interface PacingMetadata {
    lastInboundAt: string | null;
    lastOutboundAt: string | null;
    nextEligibleSendAt: string | null;
    customerServiceWindowUntil: string | null; // 24h window after last lead reply
    lastTypingDurationMs: number;
    lastReadDelayMs: number;
    lastDecisionDelayMs: number;
    lastTotalDelayMs: number;
    lastBatchVersion: number;
    lastSendDedupKey: string | null;
    activeSendLock: boolean;
    inboundMessageCount: number; // messages in last batch
}

export interface ComplianceMetadata {
    optOutStatus: OptOutStatus;
    lastOptOutSignal: string | null;
    optOutReason: string | null;
    optOutAt: string | null;
    qualityRiskScore: 'low' | 'medium' | 'high';
    followupCountCurrentThread: number;
    coldOutreachStage: string;
}

export interface HumanPacingInput {
    phone: string;
    stage: string;             // ConversationState from state machine
    inboundChars: number;      // total chars of inbound message(s)
    inboundMessageCount: number; // how many messages were consolidated
    outboundChars: number;     // total chars of message to be sent
    transportSupportsTyping: boolean;
    isFollowup: boolean;
    isObjection: boolean;
}

export interface HumanPacingPlan {
    readDelayMs: number;
    decisionDelayMs: number;
    typingDelayMs: number;
    jitterMs: number;
    totalDelayMs: number;
    preTypingMs: number;       // read + decision (before typing indicator)
    typingOnlyMs: number;      // typing indicator duration
    useTyping: boolean;
    splitIntoBubbles: boolean;
    bubbleGapMs: number;
    nextEligibleSendAt: string;
}

// ─── Opt-out signals (Section 2.3) ───────────────────────────

const OPT_OUT_PATTERNS = [
    /\bpare\b/i,
    /\bparar\b/i,
    /\bnão quero\b/i,
    /\btira (meu|o) (número|contato)\b/i,
    /\bme remove\b/i,
    /\bstop\b/i,
    /\bsai\b/i,
    /\bnão (me |)chama mais\b/i,
    /\bme tira\b/i,
    /\bnão (me |)manda mais\b/i,
    /\bnão (tenho |)interesse\b/i,
    /\bbloquear\b/i,
];

const BUSY_MOMENT_PATTERNS = [
    /\bagora não\b/i,
    /\btô corrido\b/i,
    /\bestou corrido\b/i,
    /\bdepois\b/i,
    /\bem atendimento\b/i,
    /\bocupado\b/i,
    /\bsem tempo\b/i,
    /\bagora não (posso|dá)\b/i,
];

// ─── Core Math ────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Section 4: Read delay
function calcReadDelay(inboundChars: number, inboundMessageCount: number): number {
    const base = clamp(700 + inboundChars * 18, 1000, 6000);
    // Extra time for burst messages (Section 16)
    const burstExtra = Math.min(Math.max(inboundMessageCount - 1, 0) * 400, 1600);
    return base + burstExtra;
}

// Section 6: Typing delay — proportional to outbound length
function calcTypingDelay(outboundChars: number): number {
    return clamp(900 + outboundChars * 45, 1500, 9000);
}

// Section 5: Decision delay — depends on stage complexity
function calcDecisionDelay(stage: string, isObjection: boolean, isFollowup: boolean): number {
    if (isObjection) return randomInt(1800, 4200);
    if (isFollowup) return randomInt(1200, 2800);

    switch (stage) {
        case 'S0_OPENING':
        case 'S1_WAITING_OPENING_REPLY':
            return randomInt(600, 1200);
        case 'S2_ROLE_CHECK':
        case 'RB_RESPONSIBLE':
        case 'RA_NON_RESPONSIBLE':
            return randomInt(800, 1800);
        case 'RB_CHANNEL_DIAGNOSIS':
        case 'RB_PAIN_CLARIFICATION':
            return randomInt(1200, 2500);
        case 'RB_VALUE_PRESENTED':
            return randomInt(1600, 3000);
        case 'RB_MEETING_PROPOSED':
        case 'RB_MEETING_CONFIRMED':
            return randomInt(1200, 2400);
        case 'RA_WAITING_CONTACT_INFO':
        case 'RA_CONTACT_CAPTURED':
            return randomInt(800, 1600);
        default:
            return randomInt(1000, 2200);
    }
}

// Section 8: Total delay cap by outbound size
function applyCap(totalDelayMs: number, outboundChars: number): number {
    if (outboundChars <= 35) return Math.min(totalDelayMs, 8000);
    if (outboundChars <= 100) return Math.min(totalDelayMs, 15000);
    if (outboundChars <= 180) return Math.min(totalDelayMs, 25000);
    return Math.min(totalDelayMs, 30000);
}

// ─── Main Plan Builder (Section 20 reference implementation) ─

export function buildHumanPacingPlan(input: HumanPacingInput): HumanPacingPlan {
    const readDelayMs = calcReadDelay(input.inboundChars, input.inboundMessageCount);
    const decisionDelayMs = calcDecisionDelay(input.stage, input.isObjection, input.isFollowup);
    const typingDelayMs = calcTypingDelay(input.outboundChars);

    const base = readDelayMs + decisionDelayMs + typingDelayMs;

    // Section 7: Jitter (proportional)
    const jitterMs = Math.round(base * ((Math.random() * 0.30) - 0.12));
    const totalDelayMs = applyCap(base + jitterMs, input.outboundChars);

    // Split into pre-typing (read+decision) and typing phase
    const preTypingMs = readDelayMs + decisionDelayMs;
    const typingOnlyMs = Math.max(1200, totalDelayMs - preTypingMs);

    // Section 11: Bubble gap
    const bubbleGapMs = randomInt(1500, 3500);

    return {
        readDelayMs,
        decisionDelayMs,
        typingDelayMs,
        jitterMs,
        totalDelayMs,
        preTypingMs,
        typingOnlyMs,
        useTyping: input.transportSupportsTyping,
        splitIntoBubbles: false, // set by caller if needed
        bubbleGapMs,
        // Section 12: nextEligibleSendAt (2s after send completes)
        nextEligibleSendAt: new Date(Date.now() + totalDelayMs + 2000).toISOString(),
    };
}

// ─── Opt-out Detection (Section 2.3 + Section 15) ───────────

export function detectOptOut(text: string): boolean {
    return OPT_OUT_PATTERNS.some(p => p.test(text));
}

export function detectBusyMoment(text: string): boolean {
    return BUSY_MOMENT_PATTERNS.some(p => p.test(text));
}

// ─── Can Send Guard (Section 12) ─────────────────────────────

export function canSendNow(pacing: Partial<PacingMetadata> | null, now: number = Date.now()): {
    allowed: boolean;
    reason: string;
} {
    if (!pacing) return { allowed: true, reason: 'no_pacing_data' };

    if (pacing.activeSendLock) {
        return { allowed: false, reason: 'active_send_lock' };
    }

    if (pacing.nextEligibleSendAt) {
        const eligibleAt = new Date(pacing.nextEligibleSendAt).getTime();
        if (now < eligibleAt) {
            const waitMs = eligibleAt - now;
            return { allowed: false, reason: `too_soon (${waitMs}ms remaining)` };
        }
    }

    return { allowed: true, reason: 'eligible' };
}

// ─── 24h Customer Service Window (Section 2.1) ───────────────

export function isWithin24hWindow(pacing: Partial<PacingMetadata> | null): boolean {
    if (!pacing?.customerServiceWindowUntil) return false;
    return Date.now() <= new Date(pacing.customerServiceWindowUntil).getTime();
}

export function build24hWindowExpiry(fromNow: Date = new Date()): string {
    const expiry = new Date(fromNow.getTime() + 24 * 60 * 60 * 1000);
    return expiry.toISOString();
}

// ─── Send Dedup Key (Section 17) ─────────────────────────────

export function buildSendDedupKey(
    phone: string,
    batchVersion: number,
    templateId: string | null,
    outboundText: string,
): string {
    const textHash = crypto
        .createHash('sha1')
        .update(outboundText.trim().toLowerCase())
        .digest('hex')
        .substring(0, 8);
    return `${phone}:${batchVersion}:${templateId || 'llm'}:${textHash}`;
}

// ─── In-memory dedup store (TTL 60s) ─────────────────────────
// Prevents double-sends even if lock is bypassed (e.g. restart)
const sentDedupStore = new Map<string, number>();
const DEDUP_TTL_MS = 60_000;

export function isDuplicate(dedupKey: string): boolean {
    const sentAt = sentDedupStore.get(dedupKey);
    if (!sentAt) return false;
    if (Date.now() - sentAt > DEDUP_TTL_MS) {
        sentDedupStore.delete(dedupKey);
        return false;
    }
    return true;
}

export function markSent(dedupKey: string): void {
    sentDedupStore.set(dedupKey, Date.now());
    // Auto-cleanup after TTL
    setTimeout(() => sentDedupStore.delete(dedupKey), DEDUP_TTL_MS + 1000);
}

// ─── Pacing Metadata Builder ──────────────────────────────────

export function buildPacingPatch(
    plan: HumanPacingPlan,
    inboundMessageCount: number,
    dedupKey: string,
    batchVersion: number,
): Partial<PacingMetadata> {
    return {
        lastOutboundAt: new Date().toISOString(),
        nextEligibleSendAt: plan.nextEligibleSendAt,
        lastTypingDurationMs: plan.typingOnlyMs,
        lastReadDelayMs: plan.readDelayMs,
        lastDecisionDelayMs: plan.decisionDelayMs,
        lastTotalDelayMs: plan.totalDelayMs,
        lastBatchVersion: batchVersion,
        lastSendDedupKey: dedupKey,
        activeSendLock: false,
        inboundMessageCount,
    };
}

export function buildInboundPacingPatch(
    inboundChars: number,
    inboundMessageCount: number,
): Partial<PacingMetadata> {
    return {
        lastInboundAt: new Date().toISOString(),
        customerServiceWindowUntil: build24hWindowExpiry(),
        inboundMessageCount,
        activeSendLock: false,
    };
}

// ─── Compliance Compliance Signal ─────────────────────────────

export function buildOptOutPatch(text: string): Partial<ComplianceMetadata> {
    return {
        optOutStatus: 'opted_out',
        lastOptOutSignal: text.trim().substring(0, 100),
        optOutAt: new Date().toISOString(),
        optOutReason: 'lead_requested',
    };
}

// ─── Rate Limit Config (Section 13) ──────────────────────────

export const CAMPAIGN_RATE_LIMITS = {
    maxNewOpensPerMinutePerNumber: 6,
    maxActiveConversationsPerMinutePerNumber: 20,
    maxFollowupsPerHourPerNumber: 30,
} as const;

// ─── Follow-up Intervals (Section 14) — conservative ─────────
// Section 14: +18h-30h, +48h-72h, +5-7 days

export const FOLLOWUP_INTERVAL_HOURS = [
    randomInt(18, 30),    // stage 1: 18-30h
    randomInt(48, 72),    // stage 2: 48-72h
    randomInt(120, 168),  // stage 3: 5-7 days
    randomInt(168, 240),  // stage 4: 7-10 days
];

export function getFollowupIntervalHours(stage: number): number {
    return FOLLOWUP_INTERVAL_HOURS[Math.min(stage, FOLLOWUP_INTERVAL_HOURS.length - 1)];
}
