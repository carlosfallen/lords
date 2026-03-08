// ================================================================
// Prospecting Strategy Bank — Playbook v1.0 Operacional Rígida
// Implements the full state machine from human.md
// States: S0_OPENING → S1_WAITING → S2_ROLE_CHECK →
//         RA (Non-Responsible) / RB (Responsible) → SX (Exit)
// ================================================================

// ─── Conversation States (Section 6 of Playbook) ────────────
export type ConversationState =
    | 'S0_OPENING'                  // First message not yet sent
    | 'S1_WAITING_OPENING_REPLY'    // Opening sent, waiting for reply
    | 'S2_ROLE_CHECK'               // Role identification in progress
    | 'RA_NON_RESPONSIBLE'          // Route A: person is not decision maker
    | 'RA_WAITING_CONTACT_INFO'     // Waiting for responsible contact info
    | 'RA_CONTACT_CAPTURED'         // Responsible contact obtained
    | 'RB_RESPONSIBLE'              // Route B: person is decision maker
    | 'RB_CHANNEL_DIAGNOSIS'        // Diagnosing current order channel
    | 'RB_PAIN_CLARIFICATION'       // Clarifying operational pain
    | 'RB_TRAUMA_HANDLING'          // Handling past bad experience
    | 'RB_VALUE_PRESENTED'          // Brief value proposition presented
    | 'RB_MEETING_PROPOSED'         // Meeting proposed
    | 'RB_MEETING_CONFIRMED'        // Meeting confirmed
    | 'SX_BLOCKED'                  // Blocked / no cooperation
    | 'SX_NOT_INTERESTED'           // Explicit disinterest
    | 'SX_NO_RESPONSE';             // No reply after limit

// ─── Route Types ────────────────────────────────────────────
export type RouteType = 'responsible' | 'non_responsible' | 'unknown';

// ─── Prospect Understanding Labels (Section 23 of Playbook) ─
export type ProspectUnderstanding =
    | 'reply_positive_open'         // "pode", "fale", "diga"
    | 'reply_asks_about'            // "sobre o quê?", "que é isso?"
    | 'reply_not_responsible'       // "não sou eu", "quem vê é o dono"
    | 'reply_is_responsible'        // "sou eu", "eu cuido", "sou o dono"
    | 'reply_gives_name'            // Gives responsible person's name
    | 'reply_gives_number'          // Gives responsible person's phone
    | 'reply_gives_role'            // Gives responsible person's role
    | 'reply_gives_best_time'       // Gives best contact time
    | 'reply_blocks_contact'        // Refuses to give contact info
    | 'reply_depends_third_party'   // Uses iFood, WhatsApp, manual
    | 'reply_has_own_channel'       // Already has own ordering channel
    | 'reply_has_manual_flow'       // Manual flow / unorganized
    | 'reply_shows_interest'        // Shows genuine interest
    | 'reply_no_time'               // "não tenho tempo"
    | 'reply_asks_price'            // "quanto custa?"
    | 'reply_not_interested'        // "não tenho interesse"
    | 'reply_accepts_meeting'       // Accepts meeting invitation
    | 'reply_rejects_meeting'       // Rejects meeting invitation
    | 'reply_confirms_diagnosis'    // "sim verdade", "isso", "exato" — confirms bot's framing
    | 'reply_had_bad_experience'    // Lead had bad experience with similar systems
    | 'reply_resistant_due_to_past' // Lead is resistant/refusing due to past trauma
    | 'reply_requests_human'        // Lead explicitly wants to talk to human
    | 'reply_ambiguous';            // Cannot classify clearly

// ─── Funnel Phases (legacy compat + new) ────────────────────
export type FunnelPhase =
    | 'opening'
    | 'role_check'
    | 'non_responsible'
    | 'responsible_diagnosis'
    | 'pain_clarification'
    | 'value_presentation'
    | 'meeting_proposal'
    | 'followup'
    | 'closed';

// ─── Detected Intent Categories (from Rust Brain) ────────────
export type DetectedIntent =
    | 'interest'
    | 'price_question'
    | 'schedule'
    | 'support'
    | 'price_objection'
    | 'transfer_human'
    | 'positive_generic'
    | 'negative_generic'
    | 'question'
    | 'greeting'
    | 'unknown';

// ─── Micro Objectives ────────────────────────────────────────
export type MicroObjective =
    | 'get_first_reply'
    | 'identify_role'
    | 'capture_responsible_contact'
    | 'discover_channel'
    | 'clarify_pain'
    | 'validate_pain_and_differentiate'
    | 'present_value'
    | 'propose_meeting'
    | 'recover_interest'
    | 'hold_price_until_context'
    | 'handle_no_time_objection'
    | 'handle_send_details_objection'
    | 'close_gracefully';

// ─── Micro Strategies ────────────────────────────────────────
export type MicroStrategy =
    | 'opening_primary'
    | 'opening_alt'
    | 'followup_open'
    | 'low_friction_role_check'
    | 'respectful_redirection'
    | 'persistent_contact_capture'
    | 'binary_channel_choice'
    | 'pain_confirmation'
    | 'trauma_handling'
    | 'value_bridge'
    | 'value_short_pitch'
    | 'meeting_invite'
    | 'no_time_recovery'
    | 'send_details_recovery'
    | 'price_context_hold'
    | 'not_interested_recovery'
    | 'graceful_close';

// ─── Strategy Object ─────────────────────────────────────────
export interface StrategyObject {
    conversationState: ConversationState;
    funnelPhase: FunnelPhase;
    routeType: RouteType;
    microObjective: MicroObjective;
    microStrategy: MicroStrategy;
    templateHint?: string;
    maxWords: number;
    allowEmoji: boolean;
    shouldAskQuestion: boolean;
    persuasionRules: PersuasionRules;
}

// ─── Persuasion Rules ────────────────────────────────────────
export interface PersuasionRules {
    maxChars: number;
    maxWords: number;
    maxSentences: number;
    allowQuestion: boolean;
    allowEmoji: boolean;
    forbidExplanation: boolean;
    forbidProductDump: boolean;
    forbidFormDump: boolean;
    forbidClosing: boolean;
    forbidPriceMention: boolean;
    forbidUrgency: boolean;
    induceShortReply: boolean;
    toneHint: 'casual' | 'direct' | 'empathetic' | 'human_commercial';
}

// ─── Phase-specific Persuasion Rules ────────────────────────
const STATE_RULES: Record<ConversationState, PersuasionRules> = {
    S0_OPENING: {
        maxChars: 200, maxWords: 30, maxSentences: 3,
        allowQuestion: true, allowEmoji: true,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: true, toneHint: 'human_commercial',
    },
    S1_WAITING_OPENING_REPLY: {
        maxChars: 150, maxWords: 22, maxSentences: 2,
        allowQuestion: false, allowEmoji: false,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: false, toneHint: 'direct',
    },
    S2_ROLE_CHECK: {
        maxChars: 120, maxWords: 18, maxSentences: 1,
        allowQuestion: true, allowEmoji: false,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: true, toneHint: 'casual',
    },
    RA_NON_RESPONSIBLE: {
        maxChars: 130, maxWords: 18, maxSentences: 2,
        allowQuestion: true, allowEmoji: true,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: true, toneHint: 'human_commercial',
    },
    RA_WAITING_CONTACT_INFO: {
        maxChars: 130, maxWords: 20, maxSentences: 2,
        allowQuestion: true, allowEmoji: false,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: true, toneHint: 'direct',
    },
    RA_CONTACT_CAPTURED: {
        maxChars: 80, maxWords: 12, maxSentences: 1,
        allowQuestion: false, allowEmoji: true,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: false,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: false, toneHint: 'human_commercial',
    },
    RB_RESPONSIBLE: {
        maxChars: 130, maxWords: 18, maxSentences: 1,
        allowQuestion: true, allowEmoji: false,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: true, toneHint: 'casual',
    },
    RB_CHANNEL_DIAGNOSIS: {
        maxChars: 140, maxWords: 20, maxSentences: 2,
        allowQuestion: true, allowEmoji: false,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: true, toneHint: 'direct',
    },
    RB_PAIN_CLARIFICATION: {
        maxChars: 150, maxWords: 22, maxSentences: 2,
        allowQuestion: true, allowEmoji: false,
        forbidExplanation: false, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: true, toneHint: 'empathetic',
    },
    RB_TRAUMA_HANDLING: {
        maxChars: 180, maxWords: 30, maxSentences: 3,
        allowQuestion: true, allowEmoji: false,
        forbidExplanation: false, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: true, toneHint: 'empathetic',
    },
    RB_VALUE_PRESENTED: {
        maxChars: 180, maxWords: 28, maxSentences: 2,
        allowQuestion: false, allowEmoji: false,
        forbidExplanation: false, forbidProductDump: false,
        forbidFormDump: true, forbidClosing: true,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: false, toneHint: 'human_commercial',
    },
    RB_MEETING_PROPOSED: {
        maxChars: 150, maxWords: 22, maxSentences: 2,
        allowQuestion: true, allowEmoji: false,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: false,
        forbidPriceMention: true, forbidUrgency: false,
        induceShortReply: true, toneHint: 'direct',
    },
    RB_MEETING_CONFIRMED: {
        maxChars: 120, maxWords: 18, maxSentences: 2,
        allowQuestion: false, allowEmoji: true,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: false,
        forbidPriceMention: true, forbidUrgency: false,
        induceShortReply: false, toneHint: 'human_commercial',
    },
    SX_BLOCKED: {
        maxChars: 80, maxWords: 12, maxSentences: 1,
        allowQuestion: false, allowEmoji: false,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: false,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: false, toneHint: 'direct',
    },
    SX_NOT_INTERESTED: {
        maxChars: 100, maxWords: 16, maxSentences: 1,
        allowQuestion: true, allowEmoji: false,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: false,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: true, toneHint: 'empathetic',
    },
    SX_NO_RESPONSE: {
        maxChars: 80, maxWords: 12, maxSentences: 1,
        allowQuestion: false, allowEmoji: false,
        forbidExplanation: true, forbidProductDump: true,
        forbidFormDump: true, forbidClosing: false,
        forbidPriceMention: true, forbidUrgency: true,
        induceShortReply: false, toneHint: 'direct',
    },
};

// ─── Understanding Classifier (Heuristics) ──────────────────
export function classifyUnderstanding(text: string, currentState: ConversationState): ProspectUnderstanding {
    const t = text.toLowerCase().trim();
    const isShort = t.length < 50;

    // --- Disinterest first (highest priority exit signals)
    if (/não (me |tenho |quero |tem )interesse|não quero|não preciso|não (é|e) pra mim|para de mandar|me tira dessa lista|chega/i.test(t)) {
        return 'reply_not_interested';
    }

    // --- Meeting acceptance (context-aware — most important at RB_MEETING_PROPOSED)
    if (currentState === 'RB_MEETING_PROPOSED') {
        // Explicit confirmations
        if (/pode (ser|marcar)|confirmo|combinado|tá (bom|ótimo|certo)|vamos|aceito|feito|marcado/i.test(t)) return 'reply_accepts_meeting';
        // Specific times with 'às'
        if (/às \d|hoje às|amanhã às|segunda|terça|quarta|quinta|sexta|sábado|domingo/i.test(t)) return 'reply_accepts_meeting';
        // Time of day without 'às' — e.g. "amanhã de tarde", "hoje de manhã"
        if (/de (tarde|manhã|noite|dia)|pela (tarde|manhã|noite)|manhã|tarde|amanhã|semana (que vem|próxima)|próxima semana/i.test(t)) return 'reply_accepts_meeting';
        // Short affirmatives at meeting stage — "hoje", "top", "sim", etc.
        if (/^(hoje|amanhã|top|bom|ok|sim|quero|claro|pode|isso|perfeito|ótimo|tá|vai|certo|fecha|marcado)([ ,!.]|$)/i.test(t) && isShort) return 'reply_accepts_meeting';
        // Interest with readiness signals
        if (/interessado|quero (ver|conhecer|marcar|agendar|confirmar)|topo|bora/i.test(t)) return 'reply_accepts_meeting';
    } else {
        // Outside meeting proposal: only very clear confirmations count
        if (/pode (ser|marcar)|confirmo|combinado|tá (bom|ótimo|certo)|vamos|aceito|ok|quero ver|feito|marcado|às \d|hoje às|amanhã às|segunda|terça|quarta|quinta|sexta/i.test(t)) {
            // Ignore if not in meeting context
        }
    }

    // --- Meeting rejection
    if (/não (tenho |tenho )?tempo|não posso|não dá|muito ocupado|agenda cheia|outra hora/i.test(t) && currentState === 'RB_MEETING_PROPOSED') {
        return 'reply_no_time';
    }
    if (/\b(n tenho|nao tenho|nn tenho)\s+(tempo|como)/i.test(t) && currentState === 'RB_MEETING_PROPOSED') {
        return 'reply_no_time';
    }

    // --- "Send details here" objection
    if (/manda (aqui|por aqui|pelo whats|no chat)|me (manda|envia|passa) (por mensagem|pelo chat|aqui|o link|as info)|passa (por aqui|pelo whats)/i.test(t)) {
        return 'reply_rejects_meeting';
    }

    // --- Price inquiry
    if (/quanto (custa|é|fica|cobram|cobra)|qual (o )?preço|tem custo|mensalidade|plano|valor|investimento/i.test(t)) {
        return 'reply_asks_price';
    }

    // --- Role: IS responsible (context-aware for S2_ROLE_CHECK)
    if (/sou (eu|o dono|a dona|o gerente|a gerente|o responsável|a responsável|eu mesmo|eu mesma)|eu (cuido|vejo|decido|cuido disso|resolvo|sou o dono|sou a dona)|eu mesmo|eu mesma|é comigo/i.test(t)) {
        return 'reply_is_responsible';
    }
    if (/\b(eu msm|eu mesmo|é comigo|sou sim|sou eu sim|eh eu|é eu)\b/i.test(t)) {
        return 'reply_is_responsible';
    }
    // In S2_ROLE_CHECK, a short "sim" means they ARE responsible
    if (
        (currentState === 'S2_ROLE_CHECK' || currentState === 'S1_WAITING_OPENING_REPLY') &&
        /^(sim|sou|sou sim|isso|é eu|é eu mesmo|eu|claro|claro que sim|correto|isso mesmo)([ ,!]|$)/i.test(t) &&
        isShort
    ) {
        return 'reply_is_responsible';
    }

    // --- Role: NOT responsible
    if (/não sou (eu|o responsável)|quem (vê|cuida|decide|resolve) (isso|essa parte|aqui) é|sou só|sou (a )?recepção|sou (o |a )?atendente|o (dono|gerente) (vê|cuida|decide)|minha (chefe|chef|sócia|sócio)/i.test(t)) {
        return 'reply_not_responsible';
    }
    if (/\b(nn sou|n sou eu|nao sou eu|nao é eu)\b/i.test(t)) {
        return 'reply_not_responsible';
    }

    // --- Gives responsible contact info
    if (/o nome (dele|dela|é)|(?:o número|celular|telefone|zap|whats) (dele|dela|é|do|da)|\+55|\(\d{2}\)|\d{4,5}[-\s]?\d{4}/i.test(t)) {
        if (currentState === 'RA_NON_RESPONSIBLE' || currentState === 'RA_WAITING_CONTACT_INFO') {
            if (/\d{8,13}/.test(t.replace(/\D/g, ''))) return 'reply_gives_number';
            return 'reply_gives_name';
        }
    }
    if (/(chama|nome|chamo|me chamo|se chama) [A-Z][a-z]/i.test(t) && currentState === 'RA_WAITING_CONTACT_INFO') {
        return 'reply_gives_name';
    }
    if (/cargo|função|é o (gerente|dono|responsável|administrador)|ocupa/i.test(t)) return 'reply_gives_role';
    if (/melhor (hora|horário|momento)|me liga (às|pela manhã|à tarde)|de manhã|de tarde|depois das|antes das/i.test(t)) return 'reply_gives_best_time';

    // --- Current channel (explicit)
    if (/(ifood|rappi|uber eats|aiqfome|só pelo (ifood|whatsapp)|só no (ifood|zap)|mais (pelo|no) (ifood|whatsapp))|não temos (site|sistema|canal próprio)|só pelo (whats|zap)/i.test(t)) {
        return 'reply_depends_third_party';
    }
    if (/\b(td|tudo|tdo)\s+(no|pelo|via)\s+(ifood|zap|whats)/i.test(t)) {
        return 'reply_depends_third_party';
    }
    if (/dependo|depende|dependemos|uso o ifood|uso o whatsapp|via ifood|pelo ifood|pelo whats|por terceiro|só (pelo|no) (ifood|whatsapp|rappi)/i.test(t)) {
        return 'reply_depends_third_party';
    }
    if (/(já temos (site|sistema|canal próprio|link próprio|app)|temos (um )?site|temos (um )?sistema|temos canal|já tem o link)/i.test(t)) {
        return 'reply_has_own_channel';
    }
    if (/(manual|na mão|pelo whatsapp manual|no whats mesmo|anotando|caderno|papel)/i.test(t)) {
        return 'reply_has_manual_flow';
    }

    // --- Confirmation when bot is describing their situation (RB_CHANNEL_DIAGNOSIS, RB_PAIN_CLARIFICATION)
    // e.g. bot: "Então fica bastante coisa no manual né?" → lead: "sim verdade" / "isso" / "exatamente"
    if (
        (currentState === 'RB_CHANNEL_DIAGNOSIS' || currentState === 'RB_PAIN_CLARIFICATION') &&
        /^(sim|isso|exato|exatamente|verdade|correto|é isso|é mesmo|isso mesmo|é exatamente|com certeza|claro|é|tá certo|pode apostar|bastante|muito|pesado)([ ,!.]|$)/i.test(t) &&
        isShort
    ) {
        return 'reply_confirms_diagnosis';
    }

    // --- "About what?" inquiry
    if (/(sobre o qu[eê]|que (chegou|é isso)|é de qu[eê]|qual (é o |o )?assunto|do que se trata|o que é isso|que produto|que serviço)/i.test(t)) {
        return 'reply_asks_about';
    }

    // --- Blocks contact info sharing
    if (/(não (posso|vou) (passar|dar|fornecer)|não tenho autorização|não passo|não sei|não conheço o número)/i.test(t) && (currentState === 'RA_NON_RESPONSIBLE' || currentState === 'RA_WAITING_CONTACT_INFO')) {
        return 'reply_blocks_contact';
    }

    // --- Shows interest
    if (/(legal|interessante|quero (saber|entender|ver|conhecer)|me (conta|fala) mais|pode continuar|continue|que mais|curioso|achei interessante)/i.test(t)) {
        return 'reply_shows_interest';
    }

    // --- Positive open (short affirmative openers)
    if (/^(pode|pode falar|fale|diga|ok|olá|oi|sim|claro|vai|é|tá|ta|opa|falou|fla|manda|pode manda|pode falar|falaí|fala aí|manda bala)/i.test(t) && isShort) {
        return 'reply_positive_open';
    }
    if (/^(blz|beleza|opa|falei|flaí|flá|pode fla|kk sim|kkk sim|pode kk|top pode|bora|vlw pode)/i.test(t) && isShort) {
        return 'reply_positive_open';
    }

    return 'reply_ambiguous';
}

export interface MultiSignalResult {
    primary: ProspectUnderstanding;
    secondary?: ProspectUnderstanding;
    extractedPhone?: string;
    extractedName?: string;
    extractedChannel?: 'whatsapp' | 'ifood' | 'mixed' | 'own_channel' | 'manual' | 'unknown';
    extractedCompetitor?: string;
}

export function classifyUnderstandingMulti(text: string, state: ConversationState): MultiSignalResult {
    const primary = classifyUnderstanding(text, state);
    const result: MultiSignalResult = { primary };

    // Detect secondary channel signal if not already the primary focus
    if (/(ifood|rappi|uber eats|aiqfome|só pelo (ifood|whatsapp|whats|zap)|pelo whatsapp|só no (ifood|whatsapp|zap))/i.test(text)) {
        result.secondary = 'reply_depends_third_party';
        result.extractedChannel = 'mixed';
    }
    if (/(próprio|nosso site|nosso sistema|link próprio|já temos (site|sistema|app))/i.test(text)) {
        result.secondary = 'reply_has_own_channel';
        result.extractedChannel = 'own_channel';
    }

    // Tenta extrair telefone e nome como sinais independentes
    const phoneMatch = text.match(/\+55\s?\d{2}\s?\d{4,5}[-\s]?\d{4}|\(\d{2}\)\s?\d{4,5}[-\s]?\d{4}|\d{4,5}[-\s]\d{4}/);
    if (phoneMatch) result.extractedPhone = text.replace(/\D/g, ''); // Simplificado

    // Tenta extrair algo como "fala com o ze", "o joao cuida"
    const nameMatch = text.match(/(chama o|fala com o|o nome [eé]|se chama) ([A-ZÀ-ÿ][a-zà-ÿ]+)/i);
    if (nameMatch) result.extractedName = nameMatch[2];

    // Tenta extrair concorrente mencionado para trauma handling
    const lowerText = text.toLowerCase();
    for (const comp of ['pedeai', 'anota', 'ifood', 'aiqfome', 'cardapio']) {
        if (lowerText.includes(comp)) {
            result.extractedCompetitor = comp;
            break;
        }
    }

    return result;
}

// ─── State Transition Logic (Section 8 of Playbook) ─────────
export interface TransitionInput {
    currentState: ConversationState;
    understanding: ProspectUnderstanding;
    followupStage: number;
    maxFollowups: number;
}

export function determineNextState(input: TransitionInput): ConversationState {
    const { currentState, understanding, followupStage, maxFollowups } = input;

    switch (currentState) {
        case 'S0_OPENING':
            return 'S1_WAITING_OPENING_REPLY';

        case 'S1_WAITING_OPENING_REPLY':
            if (understanding === 'reply_positive_open' || understanding === 'reply_asks_about' || understanding === 'reply_shows_interest') return 'S2_ROLE_CHECK';
            if (understanding === 'reply_is_responsible') return 'RB_RESPONSIBLE';
            if (understanding === 'reply_not_responsible') return 'RA_NON_RESPONSIBLE';
            if (understanding === 'reply_not_interested') return 'SX_NOT_INTERESTED';
            if (followupStage >= maxFollowups) return 'SX_NO_RESPONSE';
            return 'S1_WAITING_OPENING_REPLY'; // Stay and follow up

        case 'S2_ROLE_CHECK':
            if (understanding === 'reply_is_responsible') return 'RB_RESPONSIBLE';
            if (understanding === 'reply_not_responsible') return 'RA_NON_RESPONSIBLE';
            if (understanding === 'reply_not_interested') return 'SX_NOT_INTERESTED';
            if (followupStage >= 2) return 'RB_RESPONSIBLE'; // Assume responsible after 2 vague attempts to avoid infinite loop
            return 'S2_ROLE_CHECK'; // Ambiguous — keep clarifying

        case 'RA_NON_RESPONSIBLE':
            if (understanding === 'reply_gives_name' || understanding === 'reply_gives_number' || understanding === 'reply_gives_role' || understanding === 'reply_gives_best_time') return 'RA_WAITING_CONTACT_INFO';
            if (understanding === 'reply_blocks_contact') return 'RA_WAITING_CONTACT_INFO'; // Controlled persistence
            if (followupStage >= 5) return 'SX_BLOCKED';
            return 'RA_WAITING_CONTACT_INFO';

        case 'RA_WAITING_CONTACT_INFO':
            if (understanding === 'reply_gives_number' || (understanding === 'reply_gives_name' && followupStage >= 1)) return 'RA_CONTACT_CAPTURED';
            if (understanding === 'reply_blocks_contact' && followupStage >= 4) return 'SX_BLOCKED';
            if (understanding === 'reply_gives_role' && followupStage >= 2) return 'RA_CONTACT_CAPTURED';
            return 'RA_WAITING_CONTACT_INFO';

        case 'RA_CONTACT_CAPTURED':
            return 'RA_CONTACT_CAPTURED'; // Terminal — thread closes

        case 'RB_RESPONSIBLE':
            return 'RB_CHANNEL_DIAGNOSIS'; // Always diagnose channel next

        case 'RB_CHANNEL_DIAGNOSIS':
            if (understanding === 'reply_depends_third_party' || understanding === 'reply_has_manual_flow') return 'RB_PAIN_CLARIFICATION';
            if (understanding === 'reply_has_own_channel') return 'RB_PAIN_CLARIFICATION';
            if (understanding === 'reply_confirms_diagnosis') return 'RB_PAIN_CLARIFICATION'; // "sim" after bot's channel question
            if (understanding === 'reply_positive_open') return 'RB_PAIN_CLARIFICATION';      // very short affirmative
            if (understanding === 'reply_not_interested') return 'SX_NOT_INTERESTED';
            return 'RB_CHANNEL_DIAGNOSIS'; // Keep probing

        case 'RB_PAIN_CLARIFICATION':
            if (understanding === 'reply_had_bad_experience') return 'RB_TRAUMA_HANDLING';
            if (understanding === 'reply_resistant_due_to_past') return 'RB_TRAUMA_HANDLING';
            // ANY confirmation/positive signal advances to value presentation
            if (
                understanding === 'reply_shows_interest' ||
                understanding === 'reply_depends_third_party' ||
                understanding === 'reply_has_manual_flow' ||
                understanding === 'reply_confirms_diagnosis' ||
                understanding === 'reply_positive_open' ||
                understanding === 'reply_ambiguous'  // "sim", "correto" — advance rather than loop
            ) return 'RB_VALUE_PRESENTED';
            if (understanding === 'reply_not_interested') return 'SX_NOT_INTERESTED';
            if (understanding === 'reply_asks_price') return 'RB_VALUE_PRESENTED'; // Show value before price
            return 'RB_VALUE_PRESENTED'; // Always advance — pain confirmed already

        case 'RB_TRAUMA_HANDLING':
            if (understanding === 'reply_positive_open') return 'RB_VALUE_PRESENTED';
            if (understanding === 'reply_shows_interest') return 'RB_VALUE_PRESENTED';
            if (understanding === 'reply_ambiguous') return 'RB_TRAUMA_HANDLING'; // insistir na diferenciação
            if (understanding === 'reply_not_interested') return 'SX_NOT_INTERESTED';
            if (understanding === 'reply_requests_human') return 'SX_BLOCKED'; // mapped generically for now, handled earlier by shouldEscalateToHuman
            return 'RB_VALUE_PRESENTED'; // default: avançar para diferenciação

        case 'RB_VALUE_PRESENTED':
            if (understanding === 'reply_had_bad_experience') return 'RB_TRAUMA_HANDLING';
            if (understanding === 'reply_resistant_due_to_past') return 'RB_TRAUMA_HANDLING';
            return 'RB_MEETING_PROPOSED'; // Always move to meeting after value

        case 'RB_MEETING_PROPOSED':
            if (understanding === 'reply_accepts_meeting') return 'RB_MEETING_CONFIRMED';
            if (understanding === 'reply_no_time') return 'RB_MEETING_PROPOSED';
            if (understanding === 'reply_rejects_meeting') return 'RB_MEETING_PROPOSED';
            if (understanding === 'reply_not_interested') return 'SX_NOT_INTERESTED';
            if (understanding === 'reply_asks_price') return 'RB_MEETING_PROPOSED';
            if (understanding === 'reply_asks_about') return 'RB_MEETING_PROPOSED';
            if (understanding === 'reply_ambiguous') return 'RB_MEETING_PROPOSED';
            return 'RB_MEETING_PROPOSED'; // Only explicit confirmation advances

        case 'RB_MEETING_CONFIRMED':
            return 'RB_MEETING_CONFIRMED'; // Terminal

        case 'SX_BLOCKED':
        case 'SX_NOT_INTERESTED':
        case 'SX_NO_RESPONSE':
            return currentState; // Terminal states

        default:
            return 'S0_OPENING';
    }
}

// Handle variable name typo in switch above
// (state transition logic above)

// ─── Strategy Selector ───────────────────────────────────────
export interface StrategyInput {
    currentState: ConversationState;
    nextState: ConversationState;
    understanding: ProspectUnderstanding;
    followupStage: number;
    conversationMode: 'prospecting' | 'support' | 'human';
    messageCount?: number; // used for template rotation
    lastMessageTemplateId?: string | null; // used to prevent repeat bridges
}

export function selectStrategy(input: StrategyInput): StrategyObject {
    const { currentState, nextState, understanding, followupStage } = input;
    const rules = STATE_RULES[nextState] || STATE_RULES['S0_OPENING'];

    // Determine route type
    let routeType: RouteType = 'unknown';
    if (['RB_RESPONSIBLE', 'RB_CHANNEL_DIAGNOSIS', 'RB_PAIN_CLARIFICATION', 'RB_VALUE_PRESENTED', 'RB_MEETING_PROPOSED', 'RB_MEETING_CONFIRMED'].includes(nextState)) {
        routeType = 'responsible';
    } else if (['RA_NON_RESPONSIBLE', 'RA_WAITING_CONTACT_INFO', 'RA_CONTACT_CAPTURED'].includes(nextState)) {
        routeType = 'non_responsible';
    }

    // Map state → objective + strategy + template
    const stateMap: Record<ConversationState, { obj: MicroObjective; strat: MicroStrategy; template: string; askQ: boolean; emoji: boolean; maxWords: number }> = {
        S0_OPENING: { obj: 'get_first_reply', strat: 'opening_primary', template: 'OPENING_PRIMARY', askQ: true, emoji: true, maxWords: 30 },
        S1_WAITING_OPENING_REPLY: { obj: 'get_first_reply', strat: 'followup_open', template: `FU_OPEN_${Math.min(followupStage + 1, 4)}`, askQ: false, emoji: false, maxWords: 22 },
        S2_ROLE_CHECK: { obj: 'identify_role', strat: 'low_friction_role_check', template: 'ROLE_CHECK_PRIMARY', askQ: true, emoji: false, maxWords: 18 },
        RA_NON_RESPONSIBLE: { obj: 'capture_responsible_contact', strat: 'respectful_redirection', template: 'NR_BASE_1', askQ: true, emoji: true, maxWords: 18 },
        RA_WAITING_CONTACT_INFO: { obj: 'capture_responsible_contact', strat: 'persistent_contact_capture', template: `NR_PERSIST_${Math.min(followupStage + 1, 5)}`, askQ: true, emoji: false, maxWords: 20 },
        RA_CONTACT_CAPTURED: { obj: 'close_gracefully', strat: 'graceful_close', template: 'NR_CLOSE_CAPTURED_1', askQ: false, emoji: true, maxWords: 12 },
        RB_RESPONSIBLE: { obj: 'discover_channel', strat: 'binary_channel_choice', template: 'RESP_DIAG_PRIMARY', askQ: true, emoji: false, maxWords: 18 },
        RB_CHANNEL_DIAGNOSIS: { obj: 'clarify_pain', strat: 'pain_confirmation', template: understanding === 'reply_has_own_channel' ? 'RESP_SCENARIO_OWN_CHANNEL_1' : 'RESP_SCENARIO_THIRD_PARTY_1', askQ: true, emoji: false, maxWords: 20 },
        RB_PAIN_CLARIFICATION: {
            obj: 'present_value', strat: 'value_bridge',
            // Rotate bridge variants ensuring we don't repeat the exact prior template
            template: (() => {
                const templates = ['BRIDGE_1', 'BRIDGE_2', 'BRIDGE_3', 'BRIDGE_4'];
                const lastIdx = templates.indexOf(input.lastMessageTemplateId || '');
                const nextIdx = lastIdx >= 0 ? (lastIdx + 1) % templates.length : ((input.messageCount || 0) % 4);
                return templates[nextIdx];
            })(),
            askQ: true, emoji: false, maxWords: 15
        },
        RB_TRAUMA_HANDLING: {
            obj: 'validate_pain_and_differentiate', strat: 'trauma_handling',
            template: ['RB_TRAUMA_1', 'RB_TRAUMA_2', 'RB_TRAUMA_3'][((input.messageCount || 0) % 3)],
            askQ: true, emoji: false, maxWords: 30
        },
        RB_VALUE_PRESENTED: {
            obj: 'present_value', strat: 'value_short_pitch',
            template: ['VALUE_SHORT_PRIMARY', 'VALUE_SHORT_ALT_1', 'VALUE_SHORT_ALT_2', 'VALUE_SHORT_ALT_3'][((input.messageCount || 0) % 4)],
            askQ: false, emoji: false, maxWords: 28
        },
        RB_MEETING_PROPOSED: {
            obj: 'propose_meeting',
            strat: understanding === 'reply_no_time' ? 'no_time_recovery'
                : understanding === 'reply_rejects_meeting' ? 'send_details_recovery'
                    : understanding === 'reply_asks_price' ? 'price_context_hold'
                        : 'meeting_invite',
            // Rotate invite variants on re-ask so we never repeat the same sentence
            template: understanding === 'reply_no_time' ? ['OBJ_NO_TIME_1', 'OBJ_NO_TIME_2'][((input.messageCount || 0) % 2)]
                : understanding === 'reply_rejects_meeting' ? ['OBJ_SEND_HERE_1', 'OBJ_SEND_HERE_2'][((input.messageCount || 0) % 2)]
                    : understanding === 'reply_asks_price' ? 'OBJ_PRICE_1'
                        : ['MEETING_INVITE_PRIMARY', 'MEETING_INVITE_ALT_1', 'MEETING_INVITE_ALT_2', 'MEETING_INVITE_ALT_3'][(input.followupStage || 0) % 4],
            askQ: true, emoji: false, maxWords: 22
        },
        RB_MEETING_CONFIRMED: { obj: 'close_gracefully', strat: 'graceful_close', template: 'MEETING_CONFIRMED', askQ: false, emoji: true, maxWords: 18 },
        SX_BLOCKED: { obj: 'close_gracefully', strat: 'graceful_close', template: 'CLOSE_BLOCKED', askQ: false, emoji: false, maxWords: 12 },
        SX_NOT_INTERESTED: { obj: 'recover_interest', strat: 'not_interested_recovery', template: 'OBJ_NOT_INTERESTED_RECOVERY', askQ: true, emoji: false, maxWords: 16 },
        SX_NO_RESPONSE: { obj: 'close_gracefully', strat: 'graceful_close', template: 'CLOSE_NO_RESPONSE', askQ: false, emoji: false, maxWords: 12 },
    };

    const mapped = stateMap[nextState] || stateMap['S0_OPENING'];

    // Convert state to legacy funnelPhase for compat
    const funnelPhaseMap: Record<ConversationState, FunnelPhase> = {
        S0_OPENING: 'opening', S1_WAITING_OPENING_REPLY: 'opening',
        S2_ROLE_CHECK: 'role_check',
        RA_NON_RESPONSIBLE: 'non_responsible', RA_WAITING_CONTACT_INFO: 'non_responsible', RA_CONTACT_CAPTURED: 'closed',
        RB_RESPONSIBLE: 'responsible_diagnosis', RB_CHANNEL_DIAGNOSIS: 'responsible_diagnosis',
        RB_PAIN_CLARIFICATION: 'pain_clarification',
        RB_TRAUMA_HANDLING: 'pain_clarification',
        RB_VALUE_PRESENTED: 'value_presentation', RB_MEETING_PROPOSED: 'meeting_proposal',
        RB_MEETING_CONFIRMED: 'closed',
        SX_BLOCKED: 'closed', SX_NOT_INTERESTED: 'closed', SX_NO_RESPONSE: 'closed',
    };

    return {
        conversationState: nextState,
        funnelPhase: funnelPhaseMap[nextState] || 'opening',
        routeType,
        microObjective: mapped.obj,
        microStrategy: mapped.strat,
        templateHint: mapped.template,
        maxWords: mapped.maxWords,
        allowEmoji: mapped.emoji,
        shouldAskQuestion: mapped.askQ,
        persuasionRules: rules,
    };
}

// ─── Terminal State Check ────────────────────────────────────
export function isTerminalState(state: ConversationState): boolean {
    return ['RA_CONTACT_CAPTURED', 'RB_MEETING_CONFIRMED', 'SX_BLOCKED', 'SX_NOT_INTERESTED', 'SX_NO_RESPONSE'].includes(state);
}

// ─── Conversation Outcome from State ────────────────────────
export type ConversationOutcome =
    | 'in_progress'
    | 'responsible_contact_captured'
    | 'meeting_confirmed'
    | 'blocked'
    | 'not_interested'
    | 'no_response';

export function getOutcomeFromState(state: ConversationState): ConversationOutcome {
    switch (state) {
        case 'RA_CONTACT_CAPTURED': return 'responsible_contact_captured';
        case 'RB_MEETING_CONFIRMED': return 'meeting_confirmed';
        case 'SX_BLOCKED': return 'blocked';
        case 'SX_NOT_INTERESTED': return 'not_interested';
        case 'SX_NO_RESPONSE': return 'no_response';
        default: return 'in_progress';
    }
}

// ─── Legacy compat exports ────────────────────────────────────
// PersuasionRules is already exported as interface above

// Maps Rust brain intents to our understanding labels
export function normalizeIntent(rustIntent: string): ProspectUnderstanding {
    const map: Record<string, ProspectUnderstanding> = {
        'intent.interesse_servico': 'reply_shows_interest',
        'intent.pergunta_preco': 'reply_asks_price',
        'intent.agendar': 'reply_accepts_meeting',
        'intent.suporte_tecnico': 'reply_ambiguous',
        'intent.objecao_preco': 'reply_asks_price',
        'intent.transferir_humano': 'reply_accepts_meeting', // mapped this to prevent dropout
        'intent.complexa_llm': 'reply_ambiguous',
        'intent.desconhecido': 'reply_ambiguous',
    };
    return map[rustIntent] || 'reply_ambiguous';
}

// Legacy getMissingFields for state.service.ts compat
export const REQUIRED_LEAD_FIELDS = ['name', 'phone'] as const;
export function getMissingFields(lead: Record<string, any>): string[] {
    return REQUIRED_LEAD_FIELDS.filter(f => !lead[f] || String(lead[f]).trim() === '');
}

// ─── Sprint 4: Trauma Handling & Escalation ───────────────────
export const COMPETITOR_DIFFERENTIATION: Record<string, string> = {
    'pedeai': 'diferente do PedeAi, aqui não tem taxa em cima de cada pedido',
    'anota': 'diferente da Anota.ai, aqui você é dono do sistema — não a gente',
    'ifood': 'diferente do iFood, aqui você não paga comissão e o cliente é seu',
    'aiqfome': 'diferente do AiQFome, aqui não tem dependência de plataforma de terceiro',
    'cardapio': 'diferente de sistema de cardápio, aqui tem caixa integrado e controle completo',
};

export function shouldEscalateToHuman(
    state: any,
    understanding: ProspectUnderstanding,
    text: string,
): boolean {
    const traumaHandlingAttempts = state.traumaHandlingAttempts || 0;
    const opportunityScore = state.opportunityScore || 0;

    // Resistência repetida
    if (traumaHandlingAttempts >= 2) return true;

    // Pedido explícito
    if (understanding === 'reply_requests_human') return true;

    // Alta resistência mas lead valioso
    if (opportunityScore >= 30 && understanding === 'reply_resistant_due_to_past') return true;

    // Menciona concorrente e já teve 1 tentativa de trauma handling
    if (state.mentionedCompetitor && traumaHandlingAttempts >= 1) return true;

    return false;
}
