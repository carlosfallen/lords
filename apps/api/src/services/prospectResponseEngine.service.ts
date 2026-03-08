// ================================================================
// Prospecting Response Engine — Playbook v1.0 Main Orchestrator
// Implements: Section 21 pseudocode exactly
// Pipeline: Classify Intent → Decide State → Select Strategy →
//           Generate → Validate → Repair → Extract State → Dispatch
// ================================================================

import { db, leads, leadConversations, prospectCampaigns, prospectQueues } from 'db';
import { eq } from 'drizzle-orm';
import { redisPublisher } from '../redis';
import { broadcast } from '../websocket';
import { aiOrchestratorService } from './aiOrchestrator.service';
import { qdrantMemoryService } from './qdrantMemory.service';

import {
    classifyUnderstandingMulti,
    normalizeIntent,
    determineNextState,
    selectStrategy,
    isTerminalState,
    getOutcomeFromState,
    shouldEscalateToHuman,
    COMPETITOR_DIFFERENTIATION,
    type ConversationState,
    type ProspectUnderstanding,
    type StrategyObject,
} from './prospectStrategyBank';

import {
    getSemanticCluster,
    buildSemanticInstruction,
    pickTemplate,
} from './prospectSemanticBank';

import {
    loadProspectingState,
    saveProspectingState,
    loadConversationHistory,
    initializeProspectingState,
    recordBotMessageSent,
    applyStatePatch,
    type ProspectingState,
    type PipelineTrace,
    type ConversationMessage,
} from './prospectConversationState.service';

import {
    validateResponse,
    buildRepairInstruction,
    type ValidationResult,
} from './prospectValidator.service';

import {
    buildHumanPacingPlan,
    detectOptOut,
    detectBusyMoment,
    canSendNow,
    buildSendDedupKey,
    isDuplicate,
    markSent,
    buildPacingPatch,
    buildInboundPacingPatch,
    buildOptOutPatch,
    build24hWindowExpiry,
} from './humanPacing.service';

import { updateLeadPersonality } from './leadPersonality.service';

// ─── Persona Constante (imutável entre conversas) ─────────────
const RAFAELA_PERSONA = `Você é Rafaela, consultora da Império Lord.

QUEM VOCÊ É:
- Direta, objetiva, levemente descontraída com leads informais
- Vai ao ponto sem parecer grossa nem robótica
- Se o lead usar kkk ou gíria, reconhece brevemente sem dramatizar
- Nunca pede desculpa quando o lead demora pra responder

NUNCA FAÇA:
- Não diga "Com certeza!", "Claro que sim!", "Fico feliz", "Estou aqui para ajudar"
- Não termine com "Qualquer dúvida, estou à disposição"
- Não use reticências (...) no fim da frase
- Não comece 2 mensagens seguidas com a mesma palavra
- Não use emojis além do 🙂 e mesmo assim só na abertura`.trim();

// ─── Controlled Generation Defaults ──────────────────────────
const GENERATION_PARAMS = {
    temperature: 0.55,
    top_p: 0.85,
    frequency_penalty: 0.4,
    presence_penalty: 0.2,
    max_tokens: 60,
};

// ─── Section 22 Interface ─────────────────────────────────────
export interface PipelineResult {
    text: string;
    strategy: StrategyObject;
    trace: PipelineTrace;
    sent: boolean;
    conversationState: ConversationState;
}

// ─── Analytics Event (Section 17) ─────────────────────────────
interface AnalyticsEvent {
    templateId: string | null;
    variantId: string;
    stage: string;
    outcome: string;
}

// ─── MAIN ENGINE (Section 21 Pseudocode) ─────────────────────
class ProspectResponseEngine {

    /**
     * Generate the FIRST outbound message (S0_OPENING → S1_WAITING_OPENING_REPLY)
     * Section 6: S0_OPENING → send opening → S1_WAITING_OPENING_REPLY
     */
    async generateFirstMessage(
        leadId: string,
        campaignId: string,
    ): Promise<PipelineResult> {
        const TAG = '[ProspectEngine:FirstMsg]';
        console.log(`${TAG} Starting for lead=${leadId}, campaign=${campaignId}`);

        // 1. Initialize state (Section 20 schema)
        const state = await initializeProspectingState(leadId, campaignId);

        // 2. Load lead + campaign
        const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
        const [campaign] = await db.select().from(prospectCampaigns).where(eq(prospectCampaigns.id, campaignId)).limit(1);

        if (!lead || !lead.phone) throw new Error(`Lead ${leadId} not found or missing phone`);

        // 3. Select strategy for S0_OPENING
        const strategy = selectStrategy({
            currentState: 'S0_OPENING',
            nextState: 'S0_OPENING',
            understanding: 'reply_positive_open',
            followupStage: 0,
            conversationMode: 'prospecting',
        });

        // 4. Get official template (Section 9.1)
        // Vary template based on message count across leads
        const variantIndex = state.messageCount % 4;
        const templateIds = ['OPENING_PRIMARY', 'OPENING_ALT_1', 'OPENING_ALT_2', 'OPENING_ALT_3'];
        const templateId = templateIds[variantIndex];
        const templateMessage = pickTemplate(templateId);

        let finalMessage = templateMessage;

        // 5. If no template found (shouldn't happen), generate via LLM
        if (!finalMessage) {
            const semanticCluster = getSemanticCluster('opening_primary', lead.niche);
            const semanticInstruction = buildSemanticInstruction(semanticCluster);
            const leadEmotion = (state as any).leadPersonality?.lastEmotion || 'neutral';
            const systemPrompt = this.buildSystemPrompt(strategy, semanticInstruction, lead, campaign, state, [], leadEmotion);
            const result = await this.generateAndValidate(systemPrompt, strategy, lead.niche);
            finalMessage = result.text;
        }

        // 6. Validate even template messages
        const validation = validateResponse(finalMessage, strategy.persuasionRules, 'S0_OPENING', 'opening_primary', lead.niche);
        console.log(`${TAG} Template validation: score=${validation.score}, approved=${validation.approved}`);

        // 7. Dispatch to WhatsApp
        await this.dispatch(lead.phone, finalMessage, lead.tenantId, leadId);

        // 8. Update state → S1_WAITING_OPENING_REPLY
        const newState: Partial<ProspectingState> = {
            conversationState: 'S1_WAITING_OPENING_REPLY',
            funnelPhase: 'opening',
            lastMessageTemplateId: templateId,
            validatorScore: validation.score,
        };
        const updatedState = applyStatePatch(state, newState);
        await saveProspectingState(leadId, updatedState);

        // 9. Record trace
        const trace = this.buildTrace(strategy, finalMessage, validation, 'first_message', templateId);
        await recordBotMessageSent(leadId, trace);

        // 10. Emit brain event (Section 27 observability)
        this.emitBrainEvent(lead.phone, '', finalMessage, strategy, trace);

        console.log(`${TAG} Sent opening to ${lead.phone}: "${finalMessage.substring(0, 50)}..."`);
        return { text: finalMessage, strategy, trace, sent: true, conversationState: 'S1_WAITING_OPENING_REPLY' };
    }

    /**
     * Handle a REPLY from a lead in active prospecting.
     * Implements Section 21 pseudocode handleProspectMessage()
     */
    async handleReply(
        leadId: string,
        incomingText: string,
        rustIntent: string,
        confidence: number,
    ): Promise<PipelineResult> {
        const TAG = '[ProspectEngine:Reply]';
        console.log(`${TAG} Lead=${leadId}: "${incomingText.substring(0, 50)}" intent=${rustIntent}`);

        // === Section 21: handleProspectMessage() ===

        // Step 1: Load lead + current state
        const { state, lead } = await loadProspectingState(leadId);
        const [campaign] = state.campaignId
            ? await db.select().from(prospectCampaigns).where(eq(prospectCampaigns.id, state.campaignId)).limit(1)
            : [null];

        // Load conversation history for context, applying time-gap filtering
        const rawHistory = await loadConversationHistory(leadId, 8);
        const history = this.filterRelevantHistory(rawHistory, state);

        // Update personality and emotional traits
        state.leadPersonality = updateLeadPersonality(state.leadPersonality, incomingText, history);

        // Step 2: Classify understanding (Section 23)
        // Use heuristic classifier first, then fall back to Rust intent
        const multiSignal = classifyUnderstandingMulti(incomingText, state.conversationState);
        const rustUnderstanding = normalizeIntent(rustIntent);
        const understanding: ProspectUnderstanding = (multiSignal.primary !== 'reply_ambiguous')
            ? multiSignal.primary
            : rustUnderstanding;

        // Apply secondary signals to state immediately
        const immediateStatePatch: Partial<ProspectingState> = {};
        if (multiSignal.extractedChannel && state.currentOrderChannel === 'unknown') {
            immediateStatePatch.currentOrderChannel = multiSignal.extractedChannel;
        }
        if (multiSignal.extractedPhone && !state.responsiblePhone) {
            immediateStatePatch.responsiblePhone = multiSignal.extractedPhone;
        }
        if (multiSignal.extractedName && !state.responsibleName) {
            immediateStatePatch.responsibleName = multiSignal.extractedName;
        }
        if (multiSignal.extractedCompetitor) {
            immediateStatePatch.mentionedCompetitor = multiSignal.extractedCompetitor;
        }
        // Save immediate changes if any (will be formally patched at the end)
        Object.assign(state, immediateStatePatch);

        console.log(`${TAG} MultiSignal: primary=${multiSignal.primary}, secondary=${multiSignal.secondary}, channel=${multiSignal.extractedChannel}`);

        // ─── OPT-OUT CHECK (Section 2.3 / Section 22) ──────────
        // Any opt-out signal must be suppressed immediately
        if (detectOptOut(incomingText)) {
            console.log(`${TAG} 🚫 OPT-OUT detected for ${lead.phone}`);
            const currentMeta = (lead.metadata as any) || {};
            const optOutPatch = buildOptOutPatch(incomingText);
            await db.update(leads).set({
                metadata: {
                    ...currentMeta,
                    compliance: { ...(currentMeta.compliance || {}), ...optOutPatch },
                    botActive: false,
                    conversationMode: 'human',
                    prospecting: { ...state, isActive: false, isProspecting: false, conversationOutcome: 'not_interested', shouldCloseCurrentThread: true },
                },
                updatedAt: new Date(),
            }).where(eq(leads.id, leadId));
            return { text: '', strategy: {} as any, trace: {} as any, sent: false, conversationState: 'SX_NOT_INTERESTED' };
        }

        // ─── UPDATE 24H WINDOW from lead reply ──────────────────
        // Lead just replied → update customerServiceWindowUntil
        const inboundPacingPatch = buildInboundPacingPatch(
            incomingText.length,
            1, // will be updated by consolidation
        );

        // ─── BUSY MOMENT detection (Section 15) ─────────────────
        const isBusy = detectBusyMoment(incomingText);
        if (isBusy) {
            console.log(`${TAG} Lead ${lead.phone} signaled busy moment`);
        }

        // Step 3: Determine next state (Section 8 state machine)
        let nextState = determineNextState({
            currentState: state.conversationState,
            understanding,
            followupStage: state.followupStage,
            maxFollowups: 4,
        });

        // Smart skip based on multi-signal
        if (state.conversationState === 'RB_RESPONSIBLE' && nextState === 'RB_CHANNEL_DIAGNOSIS') {
            if (multiSignal.secondary === 'reply_depends_third_party' || multiSignal.secondary === 'reply_has_own_channel') {
                console.log(`${TAG} Multi-signal detected channel info early. Skipping RB_CHANNEL_DIAGNOSIS.`);
                nextState = 'RB_PAIN_CLARIFICATION'; // skip directly
            }
        }

        console.log(`${TAG} State: ${state.conversationState} → ${nextState}`);

        // Fast forward check if the new state objective is already resolved
        if (this.checkIfAlreadyAnswered(state, nextState)) {
            console.log(`${TAG} Objective for ${nextState} already answered. Fast-forwarding.`);
            if (nextState === 'RB_CHANNEL_DIAGNOSIS') nextState = 'RB_PAIN_CLARIFICATION';
            else if (nextState === 'RA_WAITING_CONTACT_INFO') nextState = 'RA_CONTACT_CAPTURED';
        }

        // Step 4: Select strategy (Section 22 Decision Maker)
        const strategy = selectStrategy({
            currentState: state.conversationState,
            nextState,
            understanding,
            followupStage: state.followupStage,
            conversationMode: 'prospecting',
            messageCount: state.messageCount,
            lastMessageTemplateId: state.lastMessageTemplateId,
        });

        // Sprint 4: Escalação Humana
        const isEscalation = shouldEscalateToHuman(state, understanding, incomingText);
        if (isEscalation) {
            console.log(`${TAG} Lead ${lead.phone} triggered HUMAN ESCALATION.`);
            strategy.templateHint = 'SX_ESCALATE_TO_HUMAN';
            nextState = 'SX_BLOCKED'; // Terminal state
        }

        // Step 6: Get semantic cluster + instruction (Section 13)
        const semanticCluster = getSemanticCluster(strategy.microStrategy, lead.niche);
        const semanticInstruction = buildSemanticInstruction(semanticCluster);

        // Step 7: Try to use official template first (Section 9)
        let finalMessage = '';
        let templateId = strategy.templateHint || null;
        let validation: ValidationResult;

        if (templateId) {
            const templateMessage = pickTemplate(templateId, state.messageCount);
            if (templateMessage) {
                validation = validateResponse(templateMessage, strategy.persuasionRules, nextState, strategy.microStrategy, lead.niche);
                // Force approve if escalated
                if (validation.approved || isEscalation) {
                    finalMessage = templateMessage;
                    if (!validation) validation = { approved: true, score: 100, reasons: [], requiresRegeneration: false };
                    console.log(`${TAG} Using official template: ${templateId} (score=${validation.score})`);
                } else {
                    console.log(`${TAG} Template ${templateId} failed validation (score=${validation.score}), generating via LLM`);
                }
            }
        }

        // Step 8: If no template or template failed, generate via LLM pipeline
        if (!finalMessage) {
            const leadEmotion = (state as any).leadPersonality?.lastEmotion || 'neutral';
            const memoryContext = await qdrantMemoryService.getLeadMemory(lead.phone, 2);
            const systemPrompt = this.buildSystemPrompt(strategy, semanticInstruction, lead, campaign, state, history, leadEmotion, memoryContext);
            const result = await this.generateAndValidate(systemPrompt, strategy, lead.niche, incomingText, history);
            finalMessage = result.text;
            validation = validateResponse(finalMessage, strategy.persuasionRules, nextState, strategy.microStrategy, lead.niche);
        }

        // Step 9: Dispatch with human pacing
        await this.dispatchHumanized(
            lead.phone,
            finalMessage,
            lead.tenantId,
            leadId,
            state.conversationState,
            incomingText,
            isBusy,
            inboundPacingPatch,
        );

        // Step 10: Extract state patch (Section 11)
        const statePatch = this.buildStatePatch(state, nextState, strategy, understanding, finalMessage, templateId, validation!);

        // Step 11: Persist updated state
        const updatedState = applyStatePatch(state, {
            ...statePatch,
            messageCount: state.messageCount + 1,
            leadReplyCount: state.leadReplyCount + 1,
            lastContactAt: new Date().toISOString(),
            lastIntentDetected: understanding,
            lastIntent: understanding,
        });
        await saveProspectingState(leadId, updatedState);

        // Step 12: Build and record pipeline trace (Section 27)
        const trace = this.buildTrace(strategy, finalMessage, validation!, 'reply', templateId);
        await recordBotMessageSent(leadId, trace);

        // Step 13: Check if thread should close
        if (updatedState.shouldCloseCurrentThread || isTerminalState(nextState)) {
            const outcome = getOutcomeFromState(nextState);
            console.log(`${TAG} Thread closing for ${leadId}: outcome=${outcome}`);

            // Trigger Qdrant Summary Save asynchronously
            qdrantMemoryService.saveLeadMemorySummary(lead.phone, lead.tenantId, history, outcome).catch(e => console.error(e));

            await db.update(prospectQueues)
                .set({ status: 'completed' as const })
                .where(eq(prospectQueues.contactId, leadId));

            // Update lead metadata with final outcome
            const finalStatePatch = { ...updatedState, conversationOutcome: outcome, isActive: false };
            await saveProspectingState(leadId, finalStatePatch);
        }

        // Step 14: Emit brain event
        this.emitBrainEvent(lead.phone, incomingText, finalMessage, strategy, trace);

        console.log(`${TAG} Sent to ${lead.phone}: "${finalMessage.substring(0, 60)}..."`);
        return { text: finalMessage, strategy, trace, sent: true, conversationState: nextState };
    }

    // ─── Build State Patch from Response ─────────────────────
    private buildStatePatch(
        currentState: ProspectingState,
        nextState: ConversationState,
        strategy: StrategyObject,
        understanding: ProspectUnderstanding,
        message: string,
        templateId: string | null,
        validation: ValidationResult,
    ): Partial<ProspectingState> {
        const patch: Partial<ProspectingState> = {
            conversationState: nextState,
            funnelPhase: strategy.funnelPhase,
            routeType: strategy.routeType !== 'unknown' ? strategy.routeType : currentState.routeType,
            microObjective: strategy.microObjective,
            lastStrategy: strategy.microStrategy,
            lastMessageTemplateId: templateId,
            lastMicroObjective: strategy.microObjective,
            validatorScore: validation.score,
        };

        // Determine meeting status updates
        if (nextState === 'RB_MEETING_PROPOSED' && currentState.meetingStatus === 'none') {
            patch.meetingStatus = 'proposed';
            patch.lastMeaningfulStep = 'meeting_proposed';
        } else if (nextState === 'RB_MEETING_CONFIRMED') {
            patch.meetingStatus = 'confirmed';
            patch.lastMeaningfulStep = 'meeting_proposed';
            patch.requiresHumanFollowup = true;
            patch.shouldCloseCurrentThread = true;
        }

        // Responsible detected
        if (understanding === 'reply_is_responsible' || nextState === 'RB_RESPONSIBLE') {
            patch.responsibleDetected = true;
        }

        // Contact captured
        if (nextState === 'RA_CONTACT_CAPTURED') {
            patch.conversationOutcome = 'responsible_contact_captured';
            patch.shouldCloseCurrentThread = true;
        }

        // Terminal exit states
        if (nextState === 'SX_BLOCKED') {
            patch.conversationOutcome = 'blocked';
            patch.shouldCloseCurrentThread = true;
        }
        if (nextState === 'SX_NOT_INTERESTED') {
            patch.conversationOutcome = 'not_interested';
            patch.shouldCloseCurrentThread = true;
        }
        if (nextState === 'SX_NO_RESPONSE') {
            patch.conversationOutcome = 'no_response';
            patch.shouldCloseCurrentThread = true;
        }

        // Meaningful step tracking
        const stepMap: Record<ConversationState, string> = {
            'S0_OPENING': 'opening',
            'S1_WAITING_OPENING_REPLY': 'opening',
            'S2_ROLE_CHECK': 'role_check',
            'RA_NON_RESPONSIBLE': 'role_check',
            'RA_WAITING_CONTACT_INFO': 'responsible_capture',
            'RA_CONTACT_CAPTURED': 'responsible_capture',
            'RB_RESPONSIBLE': 'role_check',
            'RB_CHANNEL_DIAGNOSIS': 'diagnosis',
            'RB_PAIN_CLARIFICATION': 'diagnosis',
            'RB_VALUE_PRESENTED': 'value_presented',
            'RB_MEETING_PROPOSED': 'meeting_proposed',
            'RB_MEETING_CONFIRMED': 'meeting_proposed',
            'RB_TRAUMA_HANDLING': 'diagnosis',
            'SX_BLOCKED': 'responsible_capture',
            'SX_NOT_INTERESTED': 'diagnosis',
            'SX_NO_RESPONSE': 'opening',
        };

        if (!patch.lastMeaningfulStep) {
            patch.lastMeaningfulStep = stepMap[nextState] || 'opening';
        }

        return patch;
    }

    // ─── Filter Relevant History (Sprint 3 Enhancement) ──────
    private filterRelevantHistory(history: ConversationMessage[], state: ProspectingState): ConversationMessage[] {
        if (!state.lastContactAt || history.length === 0) return history;

        // Only keep messages from the current active session (within 12 hours)
        const lastContact = new Date(state.lastContactAt).getTime();
        const twelveHoursInMs = 12 * 60 * 60 * 1000;

        return history.filter(msg => {
            const msgTime = new Date(msg.timestamp).getTime();
            return (lastContact - msgTime) <= twelveHoursInMs;
        });
    }

    // ─── Sub-Understanding Checker (Task 7) ───────────────────
    private checkIfAlreadyAnswered(state: ProspectingState, nextState: ConversationState): boolean {
        if (nextState === 'RB_CHANNEL_DIAGNOSIS' && state.currentOrderChannel !== 'unknown') {
            return true;
        }
        if (nextState === 'RA_WAITING_CONTACT_INFO' && state.responsibleName && state.responsiblePhone) {
            return true;
        }
        return false;
    }

    // ─── System Prompt Builder (Section 12) ──────────────────
    private buildSystemPrompt(
        strategy: StrategyObject,
        semanticInstruction: string,
        lead: any,
        campaign: any | null,
        state: ProspectingState,
        history: ConversationMessage[],
        leadEmotion?: string,
        memoryContext?: string,
    ): string {
        const rules = strategy.persuasionRules;

        // ── BLOCO 1: Persona (LLMs lembram melhor o início) ─────
        const personaBlock = RAFAELA_PERSONA;

        // ── BLOCO 2: Contexto comprimido ────────────────────────
        const contextParts: string[] = [];
        contextParts.push(`OFERTA: canal próprio de pedidos | sem mensalidade | sem taxa por pedido | caixa básico | apoio de divulgação`);
        if (lead.name) contextParts.push(`LEAD: ${lead.name}`);
        if (state.businessName) contextParts.push(`NEGÓCIO: ${state.businessName}`);
        if (lead.niche) contextParts.push(`SEGMENTO: ${lead.niche}`);
        if (state.currentOrderChannel && state.currentOrderChannel !== 'unknown') {
            contextParts.push(`CANAL ATUAL: ${state.currentOrderChannel}`);
        }
        if ((state as any).leadPersonality?.communicationStyle && (state as any).leadPersonality.communicationStyle !== 'unknown') {
            contextParts.push(`ESTILO DO LEAD: ${(state as any).leadPersonality.communicationStyle}`);
        }
        if (leadEmotion && leadEmotion !== 'neutral') {
            contextParts.push(`ESTADO EMOCIONAL DO LEAD: ${leadEmotion}`);
            if (leadEmotion === 'busy') contextParts.push(`→ Lead com pressa: máximo 10 palavras`);
            if (leadEmotion === 'cold') contextParts.push(`→ Lead frio: não force rapport, seja direto`);
            if (leadEmotion === 'playful') contextParts.push(`→ Lead de bom humor: pode ser levemente mais leve`);
        }
        if (memoryContext) {
            contextParts.push(`HISTÓRICO ANTERIOR:\n${memoryContext}`);
            contextParts.push(`→ Não repita diagnóstico já feito. Retome de onde parou.`);
        }
        const contextBlock = contextParts.join('\n');

        // ── BLOCO 3: Objetivo atual (ultra-comprimido) ───────────
        const objectiveParts: string[] = [];
        objectiveParts.push(`ESTADO: ${state.conversationState} | ROTA: ${strategy.routeType}`);
        objectiveParts.push(`OBJETIVO: ${strategy.microObjective}`);

        if (strategy.routeType === 'non_responsible') {
            objectiveParts.push(`FOCO: obter contato do responsável. NÃO venda. NÃO proponha reunião ainda.`);
            if (state.followupStage > 0) {
                objectiveParts.push(`Já tentou ${state.followupStage}x. Mude o ângulo: peça ${['nome', 'número', 'cargo', 'horário', 'encaminhamento'][state.followupStage % 5]}.`);
            }
        }

        if (strategy.routeType === 'responsible') {
            const objectiveGuide: Record<string, string> = {
                discover_channel: 'Pergunte: canal próprio ou depende de WhatsApp/iFood?',
                clarify_pain: 'Confirme a dor em 1 frase. Não explique a solução ainda.',
                validate_pain_and_differentiate: `Lead indicou problema passado com sistema. OBRIGATÓRIO: Acolher a dor (sinalizar que entende o trauma) E diferenciar imediatamente.${state.mentionedCompetitor && COMPETITOR_DIFFERENTIATION[state.mentionedCompetitor] ? `\n> ATENÇÃO: O lead mencionou o sistema ${state.mentionedCompetitor}. Use esta diferença exata a nosso favor na resposta:\n> "${COMPETITOR_DIFFERENTIATION[state.mentionedCompetitor]}"` : ''}`,
                present_value: 'Apresente: "canal próprio, sem mensalidade, sem taxa por pedido" — 1 frase curta.',
                propose_meeting: 'Convide para 15-25 minutos. Ofereça: "hoje ou amanhã?" ou "qual horário?"',
                handle_no_time_objection: 'Lead sem tempo. Foque no "15-25 min" e peça o horário mais leve.',
                handle_send_details_objection: 'Lead quer por texto. Reconheça, mas reforce que no prático fica mais claro. Proponha horário.',
                hold_price_until_context: 'Lead perguntou preço cedo. Contextualize antes: "a lógica é diferente de mensalidade". Mantenha para reunião.',
                recover_interest: 'Lead disse não ter interesse. Pergunte: "é porque já tem resolvido ou não é prioridade agora?"',
                trauma_handling: `Lead indicou problema passado com sistema. OBRIGATÓRIO: Acolher a dor (sinalizar que entende o trauma) E diferenciar imediatamente.${state.mentionedCompetitor && COMPETITOR_DIFFERENTIATION[state.mentionedCompetitor] ? `\n> ATENÇÃO: O lead mencionou o sistema ${state.mentionedCompetitor}. Use esta diferença exata a nosso favor na resposta:\n> "${COMPETITOR_DIFFERENTIATION[state.mentionedCompetitor]}"` : ''}`,
            };
            const guide = objectiveGuide[strategy.microObjective] || `Objetivo: ${strategy.microObjective}`;
            objectiveParts.push(guide);
        }

        if (strategy.templateHint) {
            objectiveParts.push(`REFERÊNCIA DE TOM: ${strategy.templateHint}`);
        }
        const objectiveBlock = objectiveParts.join('\n');

        // ── BLOCO 4: Semântica comprimida ────────────────────────
        // Só as expressões humanas (mais útil que a lista completa)
        const semanticLines = semanticInstruction.split('\n')
            .filter(l => l.startsWith('-') || l.startsWith('"'))
            .slice(0, 6)
            .join('\n');
        const semanticBlock = `EXPRESSÕES: ${semanticLines}`;

        // ── BLOCO 5: Regras críticas NO FINAL (modelos lembram melhor) ──
        const rulesBlock = [
            `REGRAS INVIOLÁVEIS (aplique com prioridade máxima):`,
            `1. UMA pergunta por mensagem, no máximo`,
            `2. Máximo ${rules.maxWords} palavras — conte antes de responder`,
            `3. Sem quebra de linha`,
            `4. ANCORAGEM: sua resposta DEVE referenciar o que o lead acabou de dizer. Nunca ignore a última fala do lead.`,
            `5. Sem "Com certeza!", "Fico feliz", "Ótima pergunta", "Faz sentido?"`,
            `6. Sem linguagem corporativa`,
            `7. Sem preço${rules.forbidPriceMention ? ' (proibido nesta fase)' : ' até o lead insistir'}`,
            ``,
            `Retorne SOMENTE a mensagem. Sem aspas. Sem prefixo. Sem explicação.`,
        ].join('\n');

        // ── MONTAGEM FINAL ────────────────────────────────────────
        return [
            personaBlock,
            '',
            contextBlock,
            '',
            objectiveBlock,
            '',
            semanticBlock,
            '',
            rulesBlock,
        ].join('\n');
    }

    // ─── Generate + Validate with Retry (Section 14) ─────────
    private async generateAndValidate(
        systemPrompt: string,
        strategy: StrategyObject,
        niche: string | null | undefined,
        userMessage?: string,
        history?: ConversationMessage[],
    ): Promise<{ text: string; retries: number; validationScore: number }> {
        const MAX_RETRIES = 3; // Section 14: max 3 regenerations
        let retries = 0;
        let lastText = '';
        let lastScore = 0;
        let currentPrompt = systemPrompt;

        while (retries <= MAX_RETRIES) {
            // Build messages array (Section 12)
            const messages: any[] = [{ role: 'system', content: currentPrompt }];

            // Add limited history context
            if (history && history.length > 0) {
                for (const msg of history.slice(-6)) {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }

            // Add current user message
            if (userMessage) {
                messages.push({ role: 'user', content: userMessage });
            } else {
                messages.push({ role: 'user', content: 'Gere a primeira mensagem de prospecção.' });
            }

            // Call AI
            const rawResponse = await aiOrchestratorService.chat(messages, 'prospecting', GENERATION_PARAMS);

            // Clean output
            lastText = rawResponse
                .replace(/^[\"']|[\"']$/g, '')
                .replace(/^(Bot:|Assistente:|Rafaela:|Resposta:)\s*/i, '')
                .replace(/\*\*/g, '*')
                .trim();

            // Validate (Section 14)
            const validation = validateResponse(
                lastText,
                strategy.persuasionRules,
                strategy.conversationState,
                strategy.microStrategy,
                niche,
            );

            lastScore = validation.score;

            // Section 14 thresholds: >= 85 approve, 70-84 caution, < 70 regenerate
            if (validation.score >= 70) {
                console.log(`[ProspectEngine:Validate] PASSED (score=${validation.score}, retries=${retries})`);
                return { text: lastText, retries, validationScore: lastScore };
            }

            console.log(`[ProspectEngine:Validate] FAILED (score=${validation.score}, retries=${retries}): ${validation.reasons.join('; ')}`);

            // Build repair instruction and retry (Section 14)
            const repair = buildRepairInstruction(validation.reasons);
            currentPrompt = systemPrompt + '\n\n' + repair + '\n\nMensagem anterior (RUIM): "' + lastText + '"\nGere uma versão MELHOR.';
            retries++;
        }

        console.log(`[ProspectEngine:Validate] Max retries reached, using best attempt (score=${lastScore})`);
        return { text: lastText, retries, validationScore: lastScore };
    }

    // ─── Humanized Dispatch (Sections 3–9 + 17 + 21) ─────────
    private async dispatchHumanized(
        phone: string,
        text: string,
        tenantId: string | null,
        leadId: string,
        stage: string,
        inboundText: string,
        isBusy: boolean,
        inboundPacingPatch: Partial<import('./humanPacing.service').PacingMetadata>,
    ): Promise<void> {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
            cleanPhone = `55${cleanPhone}`;
        }

        const targetTenant = tenantId || process.env.TENANT_ID || 'default';

        // Section 16: Respect inboundMessageCount from consolidation
        const inboundCount = (inboundPacingPatch.inboundMessageCount || 1);

        // Load current pacing state
        const [currentLead] = await db.select({ metadata: leads.metadata }).from(leads).where(eq(leads.id, leadId)).limit(1);
        const currentMeta = (currentLead?.metadata as any) || {};
        const pacing = currentMeta.pacing || {};
        const batchVersion = (pacing.lastBatchVersion || 0) + 1;

        // Section 12: Check if eligible to send
        const sendCheck = canSendNow(pacing);
        if (!sendCheck.allowed) {
            console.warn(`[ProspectEngine:Pacing] canSendNow=false (${sendCheck.reason}), still proceeding (human pacing override)`);
            // Note: we still send (human turned bot on), but we log it
        }

        // Chunk message if needed (max 2 bubbles, Section 11)
        const chunks = this.splitMessage(text, 160).slice(0, 2); // enforce max 2 bubbles

        for (const [index, chunk] of chunks.entries()) {
            // Dedup check (Section 17)
            const templateId = currentMeta.prospecting?.lastMessageTemplateId || null;
            const dedupKey = buildSendDedupKey(cleanPhone, batchVersion, templateId, chunk);

            if (isDuplicate(dedupKey)) {
                console.warn(`[ProspectEngine:Dedup] Skipping duplicate send: ${dedupKey}`);
                continue;
            }

            // Build pacing plan (Sections 3–8)
            const plan = buildHumanPacingPlan({
                phone: cleanPhone,
                stage,
                inboundChars: inboundText.length,
                inboundMessageCount: inboundCount,
                outboundChars: chunk.length,
                transportSupportsTyping: true, // Go gateway handles ChatPresenceComposing natively
                isFollowup: false,
                isObjection: isBusy,
            });

            console.log(`[ProspectEngine:Pacing] Chunk ${index + 1}/${chunks.length}: preTyping=${plan.preTypingMs}ms, typing=${plan.typingOnlyMs}ms, total=${plan.totalDelayMs}ms`);

            if (index === 0) {
                // Pre-typing delay (read + decision) — Node sleeps, gateway handles typing
                await new Promise(r => setTimeout(r, plan.preTypingMs));
            } else {
                // Gap between bubbles (Section 11)
                await new Promise(r => setTimeout(r, plan.bubbleGapMs));
            }

            // NOTE: We do NOT sleep for typingOnlyMs here.
            // Instead, we pass typingMs in the Redis payload.
            // The Go gateway will send ChatPresenceComposing, wait typingMs, then send the message.
            // This gives the real WhatsApp typing indicator to the lead.

            // Persist to DB
            await db.insert(leadConversations).values({
                leadId,
                direction: 'outbound',
                senderType: 'bot',
                messageType: 'text',
                content: chunk,
                isRead: true,
            });

            await db.update(leads).set({
                lastContactAt: new Date(),
                updatedAt: new Date(),
            }).where(eq(leads.id, leadId));

            // Publish to Redis → Go Gateway → WhatsApp (with typingMs for native indicator)
            try {
                await redisPublisher.publish('channel:crm_to_bot', JSON.stringify({
                    type: 'message.send',
                    phone: cleanPhone,
                    text: chunk,
                    tenantId: targetTenant,
                    leadId,
                    typingMs: plan.typingOnlyMs, // Go gateway will show ChatPresenceComposing for this duration
                }));

                // Mark as sent in dedup store
                markSent(dedupKey);

                console.log(`[ProspectEngine:Dispatch] ✅ Chunk ${index + 1}/${chunks.length} sent (${chunk.length} chars)`);
            } catch (error: any) {
                console.error(`[ProspectEngine:Dispatch] ❌ Redis publish failed:`, error?.message);
                throw error;
            }

            // Update pacing metadata after send
            const pacingPatch = buildPacingPatch(plan, inboundCount, dedupKey, batchVersion);
            await db.update(leads).set({
                metadata: {
                    ...currentMeta,
                    pacing: { ...pacing, ...inboundPacingPatch, ...pacingPatch },
                    // Update 24h compliance window
                    compliance: {
                        ...(currentMeta.compliance || {}),
                        followupCountCurrentThread: (currentMeta.compliance?.followupCountCurrentThread || 0) + 1,
                    },
                },
                updatedAt: new Date(),
            }).where(eq(leads.id, leadId));
        }
    }

    // ─── Legacy dispatch (used for first message only) ────────
    private async dispatch(phone: string, text: string, tenantId: string | null, leadId: string): Promise<void> {
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
            cleanPhone = `55${cleanPhone}`;
        }

        const targetTenant = tenantId || process.env.TENANT_ID || 'default';
        console.log(`[ProspectEngine:Dispatch] Sending to ${cleanPhone}, tenant=${targetTenant}`);

        // Chunk long messages (max 2 bubbles, Section 11)
        const chunks = this.splitMessage(text, 160).slice(0, 2);

        for (const [index, chunk] of chunks.entries()) {
            if (index > 0) {
                // Section 11: Natural bubble gap
                const gap = Math.floor(Math.random() * (3500 - 1500 + 1)) + 1500;
                await new Promise(r => setTimeout(r, gap));
            }

            // Persist to DB
            await db.insert(leadConversations).values({
                leadId,
                direction: 'outbound',
                senderType: 'bot',
                messageType: 'text',
                content: chunk,
                isRead: true,
            });

            // Update lead last contact
            await db.update(leads).set({
                lastContactAt: new Date(),
                updatedAt: new Date(),
            }).where(eq(leads.id, leadId));

            // Publish to Redis → Go Gateway → WhatsApp
            try {
                await redisPublisher.publish('channel:crm_to_bot', JSON.stringify({
                    type: 'message.send',
                    phone: cleanPhone,
                    text: chunk,
                    tenantId: targetTenant,
                    leadId,
                }));
                console.log(`[ProspectEngine:Dispatch] ✅ Chunk ${index + 1}/${chunks.length} sent`);
            } catch (error: any) {
                console.error(`[ProspectEngine:Dispatch] ❌ Redis publish failed:`, error?.message);
                throw error;
            }
        }
    }

    private splitMessage(text: string, maxLength: number): string[] {
        // Split on single \n if multiple lines (for opening templates)
        if (text.includes('\n') && !text.includes('\n\n')) {
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length >= 2) return lines.slice(0, 2); // max 2 bubbles
        }

        if (text.length <= maxLength && !text.includes('\n\n')) return [text];

        const paragraphs = text.split(/\n\s*\n/);
        const chunks: string[] = [];

        for (const p of paragraphs) {
            if (p.length <= maxLength) {
                if (p.trim()) chunks.push(p.trim());
            } else {
                const sentences = p.match(/[^.!?]+[.!?]*\s*/g) || [p];
                let currentChunk = '';
                for (const sentence of sentences) {
                    if ((currentChunk + sentence).length > maxLength) {
                        if (currentChunk.trim()) chunks.push(currentChunk.trim());
                        currentChunk = sentence;
                    } else {
                        currentChunk += sentence;
                    }
                }
                if (currentChunk.trim()) chunks.push(currentChunk.trim());
            }
        }

        return chunks;
    }

    // ─── Build Pipeline Trace (Section 27) ────────────────────
    private buildTrace(
        strategy: StrategyObject,
        text: string,
        validation: ValidationResult,
        stage: string,
        templateId: string | null,
    ): PipelineTrace {
        return {
            timestamp: new Date().toISOString(),
            stage,
            conversationState: strategy.conversationState,
            funnelPhase: strategy.funnelPhase,
            microObjective: strategy.microObjective,
            microStrategy: strategy.microStrategy,
            templateId,
            intentDetected: null,
            routeDecision: strategy.routeType,
            validatorScore: validation.score,
            validatorPassed: validation.approved,
            validationRetries: 0,
            stateExtractorPatch: {},
            generationParams: GENERATION_PARAMS,
        };
    }

    // ─── Emit Brain Event (Section 27 observability) ──────────
    private emitBrainEvent(
        phone: string,
        userInput: string,
        botResponse: string,
        strategy: StrategyObject,
        trace: PipelineTrace,
    ): void {
        broadcast('feed.message', {
            type: 'prospect.pipeline',
            phone,
            user_text: userInput,
            llm_response: botResponse,
            intent: strategy.microStrategy,
            confidence: trace.validatorPassed ? 0.95 : 0.6,
            llm_provider: 'prospect_engine_v1',
            mode: 'prospect_engine',
            latency_ms: 0,
            context_used: true,
            // Section 27 pipeline metadata
            pipeline: {
                conversationState: strategy.conversationState,
                funnelPhase: strategy.funnelPhase,
                routeType: strategy.routeType,
                microObjective: strategy.microObjective,
                microStrategy: strategy.microStrategy,
                templateId: trace.templateId,
                intentDetected: trace.intentDetected,
                routeDecision: trace.routeDecision,
                validatorScore: trace.validatorScore,
                validatorPassed: trace.validatorPassed,
                validationRetries: trace.validationRetries,
            },
        });
    }
}

export const prospectResponseEngine = new ProspectResponseEngine();
