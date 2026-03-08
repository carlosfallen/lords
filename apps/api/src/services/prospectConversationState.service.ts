// ================================================================
// Prospecting Conversation State Manager — Playbook v1.0
// Manages ProspectingState with full JSONB schema (Section 20)
// ================================================================

import { db, leads, leadConversations } from 'db';
import { eq, desc } from 'drizzle-orm';
import type {
    ConversationState,
    RouteType,
    ProspectUnderstanding,
    MicroObjective,
    MicroStrategy,
    ConversationOutcome,
    FunnelPhase,
} from './prospectStrategyBank';
import { getMissingFields } from './prospectStrategyBank';

// ─── Full JSONB Schema (Section 20 of Playbook) ──────────────
export interface ProspectingState {
    // Active status
    isActive: boolean;
    campaignId: string | null;

    // State machine (Section 6)
    conversationState: ConversationState;
    routeType: RouteType;

    // Responsible detection (Section 11)
    responsibleDetected: boolean;
    responsibleName: string | null;
    businessName: string | null;
    responsibleRole: string | null;
    responsiblePhone: string | null;
    bestContactTime: string | null;

    // Lead Personality (Sprint 3)
    leadPersonality?: {
        communicationStyle: 'formal' | 'informal' | 'direct' | 'unknown';
        responseSpeed: 'fast' | 'slow' | 'unknown';
        lastEmotion: 'neutral' | 'busy' | 'cold' | 'playful';
    };

    // Lead role
    leadRoleDetected: 'owner' | 'manager' | 'attendant' | 'receptionist' | 'unknown';

    // Channel info
    currentOrderChannel: 'whatsapp' | 'ifood' | 'mixed' | 'own_channel' | 'manual' | 'unknown';
    hasOwnChannel: 'yes' | 'no' | 'partial' | 'unknown';

    // Pain identification
    painType: Array<'dependency_on_platforms' | 'margin_loss' | 'manual_attendance' | 'lack_of_control'>;

    // Interest tracking
    interestLevel: 'low' | 'medium' | 'high' | 'unknown';
    opportunityScore: number;

    // Meeting status
    meetingStatus: 'none' | 'exploring' | 'proposed' | 'confirmed';
    proposedTime: string | null;
    confirmedTime: string | null;

    // Trauma Handling (Sprint 4)
    traumaHandlingAttempts: number;
    mentionedCompetitor: string | null;

    // Outcome
    conversationOutcome: ConversationOutcome;
    lastMeaningfulStep: string;

    // Follow-up tracking
    followupStage: number;
    lastFollowupSentAt: string | null;

    // Analytics/Templates
    lastMessageTemplateId: string | null;
    lastMicroObjective: MicroObjective | null;
    lastIntentDetected: ProspectUnderstanding | null;
    validatorScore: number;

    // Thread control
    shouldCloseCurrentThread: boolean;

    // Message counts
    messageCount: number;
    leadReplyCount: number;

    // Timestamps
    firstMessageSentAt: string | null;
    lastContactAt: string | null;
    lastUpdatedAt: string;

    // Legacy compat
    isProspecting: boolean;
    conversationMode: 'prospecting' | 'support' | 'human' | 'idle';
    funnelPhase: FunnelPhase;
    microObjective: MicroObjective | null;
    lastStrategy: MicroStrategy | null;
    collectedFields: string[];
    missingFields: string[];
    lastPipelineTrace: PipelineTrace | null;
    mainPain: string | null;
    identifiedNiche: string | null;
    requiresHumanFollowup: boolean;
    conversationSummary: string;
    lastIntent: ProspectUnderstanding | null;
}

// ─── Pipeline Trace (for observability) ─────────────────────
export interface PipelineTrace {
    timestamp: string;
    stage: string;
    conversationState: ConversationState;
    funnelPhase: FunnelPhase;
    microObjective: MicroObjective | null;
    microStrategy: MicroStrategy | null;
    templateId: string | null;
    intentDetected: ProspectUnderstanding | null;
    routeDecision: RouteType;
    validatorScore: number;
    validatorPassed: boolean;
    validationRetries: number;
    stateExtractorPatch: Partial<ProspectingState>;
    generationParams: Record<string, number>;
}

// ─── Conversation Message ────────────────────────────────────
export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

// ─── Default State Factory ────────────────────────────────────
export function defaultState(): ProspectingState {
    return {
        isActive: false,
        campaignId: null,
        conversationState: 'S0_OPENING',
        routeType: 'unknown',
        responsibleDetected: false,
        responsibleName: null,
        businessName: null,
        responsibleRole: null,
        responsiblePhone: null,
        bestContactTime: null,
        leadPersonality: {
            communicationStyle: 'unknown',
            responseSpeed: 'unknown',
            lastEmotion: 'neutral',
        },
        leadRoleDetected: 'unknown',
        currentOrderChannel: 'unknown',
        hasOwnChannel: 'unknown',
        painType: [],
        interestLevel: 'unknown',
        opportunityScore: 0,
        meetingStatus: 'none',
        proposedTime: null,
        confirmedTime: null,
        traumaHandlingAttempts: 0,
        mentionedCompetitor: null,
        conversationOutcome: 'in_progress',
        lastMeaningfulStep: 'opening',
        followupStage: 0,
        lastFollowupSentAt: null,
        lastMessageTemplateId: null,
        lastMicroObjective: null,
        lastIntentDetected: null,
        validatorScore: 0,
        shouldCloseCurrentThread: false,
        messageCount: 0,
        leadReplyCount: 0,
        firstMessageSentAt: null,
        lastContactAt: null,
        lastUpdatedAt: new Date().toISOString(),
        // Legacy compat
        isProspecting: false,
        conversationMode: 'idle',
        funnelPhase: 'opening',
        microObjective: null,
        lastStrategy: null,
        collectedFields: [],
        missingFields: [],
        lastPipelineTrace: null,
        mainPain: null,
        identifiedNiche: null,
        requiresHumanFollowup: false,
        conversationSummary: '',
        lastIntent: null,
    };
}

// ─── Load State ───────────────────────────────────────────────
export async function loadProspectingState(leadId: string): Promise<{
    state: ProspectingState;
    lead: any;
}> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const meta = (lead.metadata as any) || {};
    const stored = meta.prospecting || {};

    const state: ProspectingState = {
        ...defaultState(),
        ...stored,
    };

    // Recompute missing fields from live lead data
    state.missingFields = getMissingFields(lead);
    state.collectedFields = ['name', 'phone'].filter(f => !state.missingFields.includes(f));

    return { state, lead };
}

// ─── Save State ──────────────────────────────────────────────
export async function saveProspectingState(leadId: string, state: ProspectingState): Promise<void> {
    const [lead] = await db.select({ metadata: leads.metadata }).from(leads).where(eq(leads.id, leadId)).limit(1);
    const currentMeta = (lead?.metadata as any) || {};

    state.lastUpdatedAt = new Date().toISOString();

    // ─── CRITICAL: Root metadata must always reflect 'prospecting' mode
    // while the lead is active, so the ConversationRouter routes replies
    // back here instead of to the Rust Brain or silencing them.
    // We determine the root mode from the isActive/isProspecting flags,
    // NOT from state.conversationMode which may be stale.
    let rootConversationMode: string;
    if (state.shouldCloseCurrentThread) {
        // Thread is terminal — keep prospecting in metadata for audit,
        // but remove botActive so the human can take over if needed
        rootConversationMode = 'prospecting';
    } else if (state.isActive || state.isProspecting) {
        rootConversationMode = 'prospecting';
    } else {
        rootConversationMode = currentMeta.conversationMode || 'support';
    }

    // Keep botActive = true while prospecting bot is active and thread isn't closed
    const botActive = !state.shouldCloseCurrentThread;

    await db.update(leads).set({
        metadata: {
            ...currentMeta,
            prospecting: state,
            conversationMode: rootConversationMode,
            botActive,
        },
        updatedAt: new Date(),
    }).where(eq(leads.id, leadId));
}

// ─── Initialize Prospecting State ────────────────────────────
export async function initializeProspectingState(
    leadId: string,
    campaignId: string,
): Promise<ProspectingState> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);

    const state: ProspectingState = {
        ...defaultState(),
        isActive: true,
        isProspecting: true,
        campaignId,
        conversationState: 'S0_OPENING',
        conversationMode: 'prospecting',
        funnelPhase: 'opening',
        firstMessageSentAt: new Date().toISOString(),
    };

    if (lead) {
        state.missingFields = getMissingFields(lead);
        state.collectedFields = ['name', 'phone'].filter(f => !state.missingFields.includes(f));
    }

    await saveProspectingState(leadId, state);
    return state;
}

// ─── Load Conversation History ────────────────────────────────
export async function loadConversationHistory(
    leadId: string,
    limit: number = 10,
): Promise<ConversationMessage[]> {
    const messages = await db.select({
        content: leadConversations.content,
        senderType: leadConversations.senderType,
        createdAt: leadConversations.createdAt,
    })
        .from(leadConversations)
        .where(eq(leadConversations.leadId, leadId))
        .orderBy(desc(leadConversations.createdAt))
        .limit(limit);

    return messages.reverse().map(m => ({
        role: m.senderType === 'lead' ? 'user' as const : 'assistant' as const,
        content: m.content || '',
        timestamp: m.createdAt?.toISOString() || '',
    })).filter(m => m.content.trim() !== '');
}

// ─── Consolidation Buffer ─────────────────────────────────────
// Collects rapid sequential messages and consolidates them into
// a single text so the bot responds once, not N times.
// e.g. "opa" + "boa noite" + "pode dizer ai" → "opa boa noite pode dizer ai"
const consolidationBuffer = new Map<string, {
    messages: string[];
    timer: any;
    resolvers: Array<(text: string) => void>;
}>();

const CONSOLIDATION_WINDOW_MS = 2500;

export function consolidateMessages(phone: string, text: string): Promise<string> {
    return new Promise((resolve) => {
        const existing = consolidationBuffer.get(phone);

        if (existing) {
            // Add text and this resolver to existing batch
            existing.messages.push(text);
            existing.resolvers.push(resolve);

            // Reset the debounce timer
            clearTimeout(existing.timer);
            existing.timer = setTimeout(() => {
                const consolidated = existing.messages.join(' ');
                consolidationBuffer.delete(phone);
                // Resolve ALL pending callers with the same consolidated text
                for (const r of existing.resolvers) r(consolidated);
            }, CONSOLIDATION_WINDOW_MS);
        } else {
            // First message — start a new batch
            const entry = {
                messages: [text],
                resolvers: [resolve],
                timer: setTimeout(() => {
                    const consolidated = entry.messages.join(' ');
                    consolidationBuffer.delete(phone);
                    for (const r of entry.resolvers) r(consolidated);
                }, CONSOLIDATION_WINDOW_MS),
            };
            consolidationBuffer.set(phone, entry);
        }
    });
}

// ─── Record Bot Message Sent ─────────────────────────────────
export async function recordBotMessageSent(leadId: string, trace: PipelineTrace): Promise<void> {
    const { state } = await loadProspectingState(leadId);
    state.messageCount += 1;
    state.lastContactAt = new Date().toISOString();
    state.lastPipelineTrace = trace;
    state.lastStrategy = trace.microStrategy;
    state.lastMessageTemplateId = trace.templateId;
    state.lastMicroObjective = trace.microObjective;
    state.validatorScore = trace.validatorScore;
    if (!state.firstMessageSentAt) {
        state.firstMessageSentAt = new Date().toISOString();
    }
    await saveProspectingState(leadId, state);
}

// ─── Record Lead Reply ────────────────────────────────────────
export async function recordLeadReply(leadId: string, intent: ProspectUnderstanding): Promise<void> {
    const { state } = await loadProspectingState(leadId);
    state.leadReplyCount += 1;
    state.lastContactAt = new Date().toISOString();
    state.lastIntentDetected = intent;
    state.lastIntent = intent;
    await saveProspectingState(leadId, state);
}

// ─── Apply State Patch ────────────────────────────────────────
export function applyStatePatch(state: ProspectingState, patch: Partial<ProspectingState>): ProspectingState {
    return { ...state, ...patch };
}
