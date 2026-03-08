// ================================================================
// Prospecting Post-Generation Validator — Playbook v1.0
// Implements: Section 14 — Validation & Regeneration
// Score 0-100 scale. Approve >= 85, caution 70-84, regenerate < 70
// ================================================================

import type { PersuasionRules } from './prospectStrategyBank';
import { checkForbiddenPatterns } from './prospectSemanticBank';

// ─── Validation Result (Section 14.1) ────────────────────────
export interface ValidationResult {
    approved: boolean;          // score >= 85
    score: number;              // 0-100
    reasons: string[];          // violation descriptions
    requiresRegeneration: boolean; // score < 70
}

// ─── Immediate Score 0 conditions (Section 14.1) ─────────────
const DISQUALIFYING_PATTERNS: { pattern: RegExp; reason: string }[] = [
    {
        pattern: /\?.*\?/s,
        reason: 'SCORE_0: more than one question in message',
    },
    {
        pattern: /vai vender mais|vai dobrar vendas|garante lucro|vai substituir tudo/i,
        reason: 'SCORE_0: promises exaggerated results (Rule R8)',
    },
    {
        pattern: /últimas vagas|promoção acaba hoje|só hoje|apenas 3 vagas|promoção relâmpago/i,
        reason: 'SCORE_0: false urgency detected (Rule R9)',
    },
    {
        pattern: /https?:\/\//i,
        reason: 'SCORE_0: URL found in prospecting message',
    },
];

// ─── Robotic/AI phrase patterns ──────────────────────────────
const ROBOTIC_PATTERNS: RegExp[] = [
    /com certeza!/i,
    /fico feliz/i,
    /estou aqui para/i,
    /posso ajudar em algo mais/i,
    /tem mais alguma dúvida/i,
    /espero ter ajudado/i,
    /ótima pergunta/i,
    /excelente escolha/i,
    /claro, vou te explicar/i,
    /como posso te auxiliar/i,
];

// ─── Announcement/ad-like patterns (Rule R3) ─────────────────
const ANNOUNCEMENT_PATTERNS: RegExp[] = [
    /apresentamos|apresentando|conheça (nossa|nosso|o|a)/i,
    /lançamento/i,
    /oferta especial/i,
    /imperdível/i,
    /acesso exclusivo/i,
];

// ─── Main Validator ───────────────────────────────────────────
export function validateResponse(
    text: string,
    rules: PersuasionRules,
    conversationState: string,
    strategy: string,
    niche?: string | null,
): ValidationResult {
    const reasons: string[] = [];
    let score = 100;

    // ─── DISQUALIFYING CHECKS (score → 0 immediately) ───────
    for (const { pattern, reason } of DISQUALIFYING_PATTERNS) {
        if (pattern.test(text)) {
            return {
                approved: false,
                score: 0,
                reasons: [reason],
                requiresRegeneration: true,
            };
        }
    }

    // Check: more than one question mark (Rule R1)
    const questionCount = (text.match(/\?/g) || []).length;
    if (questionCount > 1) {
        return {
            approved: false,
            score: 0,
            reasons: ['SCORE_0: more than one question per message (Rule R1)'],
            requiresRegeneration: true,
        };
    }

    // Check: too many line breaks (Rule R2 — no textão)
    const lineBreaks = (text.match(/\n/g) || []).length;
    if (lineBreaks >= 2) {
        return {
            approved: false,
            score: 0,
            reasons: ['SCORE_0: text wall detected — 2+ line breaks (Rule R2)'],
            requiresRegeneration: true,
        };
    }

    // Check: word count > 30 (Rule R2)
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 30) {
        return {
            approved: false,
            score: 0,
            reasons: [`SCORE_0: ${wordCount} words exceeds maximum 30 (Rule R2)`],
            requiresRegeneration: true,
        };
    }

    // ─── FORBIDDEN PATTERNS (Section 13.2) ───────────────────
    const forbidden = checkForbiddenPatterns(text);
    if (forbidden.length > 0) {
        // Hard fail on blacklist
        return {
            approved: false,
            score: 0,
            reasons: forbidden,
            requiresRegeneration: true,
        };
    }

    // ─── ANNOUNCEMENT DETECTION ───────────────────────────────
    for (const pattern of ANNOUNCEMENT_PATTERNS) {
        if (pattern.test(text)) {
            reasons.push('sounds like announcement/ad (Rule R3)');
            score -= 30;
        }
    }

    // ─── ROBOTIC/AI LANGUAGE ─────────────────────────────────
    for (const pattern of ROBOTIC_PATTERNS) {
        if (pattern.test(text)) {
            reasons.push(`robotic/AI phrase detected: ${pattern.source}`);
            score -= 20;
        }
    }

    // ─── CHARACTER COUNT ─────────────────────────────────────
    if (text.length > rules.maxChars) {
        reasons.push(`length ${text.length}ch exceeds max ${rules.maxChars}ch`);
        score -= 15;
    }

    // ─── SENTENCE COUNT ───────────────────────────────────────
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
    if (sentences.length > rules.maxSentences) {
        reasons.push(`${sentences.length} sentences exceeds max ${rules.maxSentences}`);
        score -= 10;
    }

    // ─── PRICE MENTION CHECK (Rule R10) ──────────────────────
    if (rules.forbidPriceMention) {
        if (/quanto (custa|é|fica|cobram)|qual (o )?preço|preço|mensalidade|investimento|plano|valor/i.test(text)) {
            reasons.push('price mention forbidden at this stage (Rule R10)');
            score -= 25;
        }
    }

    // ─── EXPLANATION/PRODUCT DUMP CHECK ──────────────────────
    if (rules.forbidExplanation) {
        const explanationPatterns = [
            /nosso (sistema|produto|serviço|software) (é|faz|permite|oferece)/i,
            /funciona assim/i,
            /basicamente/i,
            /ou seja/i,
            /em resumo/i,
        ];
        for (const p of explanationPatterns) {
            if (p.test(text)) {
                reasons.push('product explanation when forbidden');
                score -= 20;
                break;
            }
        }
    }

    // ─── CLOSING LANGUAGE CHECK ──────────────────────────────
    if (rules.forbidClosing) {
        const closingPatterns = [
            /vamos fechar/i, /quer (contratar|assinar|comprar)/i,
            /fecha(r|mos) negócio/i, /pronto pra começar/i,
        ];
        for (const p of closingPatterns) {
            if (p.test(text)) {
                reasons.push('closing language when forbidden');
                score -= 25;
                break;
            }
        }
    }

    // ─── EMOJI CHECK ─────────────────────────────────────────
    const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}]/gu) || []).length;
    if (!rules.allowEmoji && emojiCount > 0) {
        reasons.push(`${emojiCount} emoji(s) when not allowed`);
        score -= 10;
    }

    // ─── QUESTION REQUIREMENT ────────────────────────────────
    if (rules.induceShortReply && !text.includes('?')) {
        reasons.push('should induce reply but contains no question');
        score -= 10;
    }

    // ─── BINARY QUESTION LOOP PREVENTION ─────────────────────
    const isBinaryQuestion = text.match(/(sim ou não|você concorda|faz sentido\?|não acha\?|tudo bem\?|certo\?|gostaria de saber mais\?)/i);
    if (isBinaryQuestion) {
        reasons.push('weak binary yes/no question (loop prevention)');
        score -= 20;
    }

    // ─── TRAUMA HANDLING CHECK (Sprint 4) ────────────────────
    if (conversationState === 'RB_TRAUMA_HANDLING') {
        const empathyWords = /(entendo|dor|faz (total )?sentido|pior coisa|complicado|diferente|no nosso caso|garanto|ruim|problema|situação|calma|imagino)/i;
        if (!empathyWords.test(text)) {
            reasons.push('missing_pain_validation: lack of empathy or differentiation in Trauma state');
            score -= 30; // Heavy penalty
        }
    }

    // ─── SELF-IDENTIFICATION CHECK (Rule R4) ─────────────────
    // Only for opening states — must identify self
    if (conversationState === 'S0_OPENING') {
        if (!/rafaela|império lord|nossa equipe|nossa empresa/i.test(text)) {
            reasons.push('opening must identify self (Rule R4)');
            score -= 25;
        }
    }

    // ─── EMPTY OPENER CHECK (Rule R5) ────────────────────────
    if (/^(oi|olá|boa (tarde|manhã|noite))[,!]?\s*(tudo bem|como vai)/i.test(text.trim())) {
        reasons.push('empty opener without purpose (Rule R5)');
        score -= 30;
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    return {
        approved: score >= 70,   // >= 85 strict, 70-84 cautious
        score,
        reasons,
        requiresRegeneration: score < 70,
    };
}

// ─── Repair Instruction Builder (Section 14 recommendation) ──
export function buildRepairInstruction(violations: string[]): string {
    const fixes: string[] = [
        '[REPARO OBRIGATÓRIO]',
        'Sua última mensagem violou as seguintes regras:',
        ...violations.map(v => `- ${v}`),
        '',
        'Ajuste para:',
    ];

    for (const v of violations) {
        if (v.includes('question')) fixes.push('- uma única pergunta');
        if (v.includes('word') || v.includes('length') || v.includes('sentences')) fixes.push('- super curta (max 22 palavras/2 frases)');
        if (v.includes('announcement') || v.includes('ad')) fixes.push('- parecer uma pessoa real no whatsapp');
        if (v.includes('robotic')) fixes.push('- gírias leves, sem robô');
        if (v.includes('forbidden phrase')) fixes.push('- linguagem de rua, não corporativa');
        if (v.includes('line break') || v.includes('text wall')) fixes.push('- apenas uma linha');
        if (v.includes('price')) fixes.push('- omitir valor');
        if (v.includes('Result') || v.includes('R8')) fixes.push('- sem promessas irrealistas');
        if (v.includes('urgency') || v.includes('R9')) fixes.push('- remover urgência');
        if (v.includes('closing')) fixes.push('- não vender agora');
        if (v.includes('binary')) fixes.push('- pergunta aberta');
        if (v.includes('identify') || v.includes('R4')) fixes.push('- "sou Rafaela da Império Lord"');
        if (v.includes('empty opener') || v.includes('R5')) fixes.push('- ir direto ao ponto');
        if (v.includes('missing_pain_validation')) fixes.push('- demonstrar EMPATIA IMEDIATA ("entendo bem", "faz sentido essa resistência") antes de falar do serviço');
    }

    return [...new Set(fixes)].join('\n');
}
