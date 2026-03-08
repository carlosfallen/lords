// ================================================================
// Prospecting Semantic Bank — Playbook v1.0 Official Message Bank
// Implements: Section 9 (Message Bank), Section 13 (Semantic Bank)
// ================================================================

import type { MicroStrategy } from './prospectStrategyBank';

// ─── Official Message Templates (Section 9) ──────────────────

export const MESSAGE_TEMPLATES: Record<string, string> = {
    // 9.1 — Opening
    OPENING_PRIMARY: 'Oi, sou Rafaela da equipe da Império Lord 🙂\nTe chamei porque a gente tá falando com alguns deliveries sobre uma forma de vender sem mensalidade e sem taxa por pedido.\nPosso te explicar rapidinho?',
    OPENING_ALT_1: 'Oi, sou Rafaela da equipe da Império Lord 🙂\nTô entrando em contato porque ajudamos delivery a vender no próprio canal sem mensalidade e sem taxa em cima dos pedidos.\nPosso te fazer uma pergunta rápida?',
    OPENING_ALT_2: 'Oi, sou Rafaela da equipe da Império Lord.\nTalvez isso faça sentido pro delivery de vocês: pedido próprio sem taxa por venda.\nPosso te explicar?',
    OPENING_ALT_3: 'Oi, sou Rafaela da equipe da Império Lord.\nTe chamei por um motivo bem específico sobre o delivery de vocês.\nPosso ser direta?',

    // 9.2 — Opening Follow-ups (in order: FU_OPEN_1 → FU_OPEN_4)
    FU_OPEN_1: 'Prometo ser objetiva: é sobre vocês terem um canal próprio de pedidos sem mensalidade e sem taxa por venda.',
    FU_OPEN_2: 'Se não for você quem cuida dessa parte aí, me fala só quem vê isso e eu falo certo 🙂',
    FU_OPEN_3: 'Te chamei porque isso costuma fazer diferença quando o delivery quer vender no próprio canal sem perder parte do pedido em taxa.',
    FU_OPEN_4: 'A ideia não é te tomar tempo. É só entender se isso faz sentido pra operação de vocês ou não.',

    // 9.3 — Role Check
    ROLE_CHECK_PRIMARY: 'Você que cuida dessa parte do delivery aí ou é outra pessoa que vê isso?',
    ROLE_CHECK_ALT_1: 'É você quem decide essa parte ou outra pessoa cuida disso?',
    ROLE_CHECK_ALT_2: 'Quem vê essa parte aí é você ou outra pessoa da operação?',

    // 9.4 — Not Responsible (Route A)
    NR_BASE_1: 'Perfeito. Prefiro falar com a pessoa certa pra não te tomar tempo. Quem costuma ver isso aí?',
    NR_BASE_2: 'Entendi. Quem normalmente cuida dessa parte aí?',
    NR_BASE_3: 'Certo. Quem decide isso por aí?',

    // 9.5 — About What?
    ABOUT_SHORT_1: 'É sobre uma forma de o delivery vender no próprio canal, sem mensalidade e sem taxa por pedido.',
    ABOUT_SHORT_2: 'É sobre pedido próprio sem taxa em cima da venda.',
    ABOUT_SHORT_3: 'É algo ligado a canal próprio de pedidos e mais controle da operação.',
    ABOUT_SHORT_4: 'É sobre vender sem repassar parte do pedido em taxa de plataforma.',

    // 9.6 — Route A Persistence
    NR_PERSIST_1: 'Perfeito. Você consegue me passar o nome ou número de quem vê isso?',
    NR_PERSIST_2: 'Se preferir, pode me dizer só o cargo de quem cuida dessa parte aí.',
    NR_PERSIST_3: 'Pra eu não ficar falando com a pessoa errada, me passa só o responsável por isso.',
    NR_PERSIST_4: 'Pode ser o número, o nome ou até o melhor horário pra eu falar com essa pessoa.',
    NR_PERSIST_5: 'Se ficar mais fácil, você pode só encaminhar essa mensagem pra quem decide essa parte aí.',

    // 9.7 — Route A Close
    NR_CLOSE_CAPTURED_1: 'Perfeito, valeu por me direcionar 🙂',
    NR_CLOSE_CAPTURED_2: 'Perfeito. Vou falar certo com essa pessoa.',
    NR_CLOSE_CAPTURED_3: 'Obrigado, ajudou bastante.',

    // 9.8 — Route B: Diagnose channel
    RESP_DIAG_PRIMARY: 'Hoje vocês já têm canal próprio de pedidos ou dependem mais de WhatsApp/iFood?',
    RESP_DIAG_ALT_1: 'Hoje os pedidos de vocês vêm mais por canal próprio ou por WhatsApp/iFood?',
    RESP_DIAG_ALT_2: 'Vocês já têm pedido próprio ou a operação roda mais no WhatsApp/iFood?',
    RESP_DIAG_ALT_3: 'Hoje vocês vendem mais por canal próprio ou por terceiros?',

    // 9.9 — Scenario Confirmation
    RESP_SCENARIO_THIRD_PARTY_1: 'Entendi. Então ainda fica bastante coisa passando por canal de terceiro ou atendimento manual, né?',
    RESP_SCENARIO_THIRD_PARTY_2: 'Entendi. Então parte importante dos pedidos ainda depende de terceiros ou atendimento manual, certo?',
    RESP_SCENARIO_OWN_CHANNEL_1: 'Boa. E hoje isso realmente roda bem ou ainda muita coisa fica no WhatsApp/manual?',
    RESP_SCENARIO_OWN_CHANNEL_2: 'Entendi. E esse canal próprio hoje funciona redondo ou ainda fica muito pedido no manual?',

    // 9.10 — Value Bridge
    BRIDGE_1: 'É justamente essa parte que a gente resolve. Faz sentido eu te explicar como funciona na prática?',
    BRIDGE_2: 'Foi por isso mesmo que te chamei. Posso te mostrar como?',
    BRIDGE_3: 'Esse é exatamente o ponto que faz muita gente olhar nossa estrutura. Posso te detalhar rapidão?',
    BRIDGE_4: 'A ideia é tirar essa dependência de taxa e organizar o fluxo. Faz sentido eu te mostrar?',

    // Sprint 4 — Trauma Handling & Escalation
    RB_TRAUMA_1: 'Entendo bem essa dor. No nosso caso é diferente — a gente não quer que o teu negócio dependa da Império Lord. Posso te mostrar a diferença?',
    RB_TRAUMA_2: 'Faz total sentido essa resistência. Quem já passou por sistema ruim não quer arriscar de novo. O que te garanto é que aqui não tem taxa em cima da venda e nem mensalidade. Posso explicar como funciona?',
    RB_TRAUMA_3: 'Pior coisa é sistema que você contratou e virou problema. A gente entende isso — por isso a proposta aqui é diferente desde o modelo. Quer ver como funciona na prática?',
    SX_ESCALATE_TO_HUMAN: 'Entendi a sua situação. Deixa eu chamar alguém do nosso time pra te ouvir melhor — alguém que pode responder tudo isso com mais detalhe e calma.',

    // 9.11 — Short Value Presentation
    VALUE_SHORT_PRIMARY: 'A gente trabalha com uma estrutura pro delivery vender no próprio canal, com site de pedidos, caixa básico e apoio de divulgação — sem mensalidade e sem taxa por pedido.',
    VALUE_SHORT_ALT_1: 'A proposta é vocês terem um canal próprio de pedidos, sem taxa em cima da venda e com mais controle da operação.',
    VALUE_SHORT_ALT_2: 'É uma forma de vender no canal de vocês, com pedido organizado, apoio de divulgação e sem cobrança por pedido.',
    VALUE_SHORT_ALT_3: 'A ideia é parar de depender só de terceiros e ter um canal próprio sem mensalidade nem taxa por venda.',

    // 9.12 — Meeting Invite
    MEETING_INVITE_PRIMARY: 'Melhor do que te explicar por texto é te mostrar isso no prático. Você prefere hoje ou amanhã?',
    MEETING_INVITE_ALT_1: 'Em 15 a 25 minutos você já consegue ver se isso faz sentido ou não. Qual horário fica melhor?',
    MEETING_INVITE_ALT_2: 'Se fizer sentido, eu te mostro de forma rápida e direta. Você prefere hoje ou amanhã?',
    MEETING_INVITE_ALT_3: 'Compensa mais eu te mostrar isso em uma conversa rápida do que te mandar textão. Qual horário te encaixa melhor?',

    // 10 — Objection Handlers
    OBJ_NO_TIME_1: 'Sem problema. Por isso mesmo a conversa é rápida, de 15 a 25 minutos. Qual horário costuma ficar mais leve pra você?',
    OBJ_NO_TIME_2: 'Entendi. Justamente por isso a ideia é ser algo rápido e direto. Qual horário fica melhor?',
    OBJ_SEND_HERE_1: 'Posso te adiantar por aqui, mas no prático fica muito mais claro em poucos minutos. Você prefere ver isso hoje ou amanhã?',
    OBJ_SEND_HERE_2: 'Eu te adianto por aqui sim, só que em conversa rápida você entende bem melhor se serve pra operação de vocês. Qual horário funciona?',
    OBJ_PRICE_1: 'Eu te passo isso sim. Antes, só quis entender se esse modelo faz sentido pro delivery de vocês, porque a lógica é bem diferente de pagar mensalidade e taxa por pedido.',
    OBJ_PRICE_2: 'Te explico certinho na conversa rápida, porque não é só site: entra canal próprio, caixa básico e apoio de divulgação.',
    OBJ_NOT_INTERESTED_RECOVERY: 'Tranquilo. Só pra eu entender: é porque vocês já têm isso resolvido ou porque não é prioridade agora?',
    OBJ_ALREADY_HAVE_1: 'Boa. E hoje ele realmente concentra os pedidos ou ainda muita coisa fica espalhada no WhatsApp/manual?',
    OBJ_NOT_PRIORITY: 'Entendi. Posso retomar isso em outro momento mais adequado.',
    OBJ_NOT_PRIORITY_CLOSE: 'Sem problema, obrigado pela sinceridade 🙂',
    OBJ_WHO_PASSED_CONTACT: 'Entrei em contato porque vi que vocês trabalham com delivery e achei que esse modelo poderia fazer sentido pra operação de vocês.',

    // Exit/Close messages
    MEETING_CONFIRMED: 'Combinado! Vou reservar esse horário pra você 🙂',
    MEETING_CONFIRMED_ALT_1: 'Perfeito. Vou guardar esse horário pra você 🙂',
    MEETING_CONFIRMED_ALT_2: 'Anotado! Vou confirmar esse horário com a equipe e te aviso.',
    MEETING_CONFIRMED_ALT_3: 'Ótimo! Deixa eu confirmar com a equipe e te mando os detalhes em breve.',
    CLOSE_BLOCKED: 'Tudo bem, obrigado pelo seu tempo.',
    CLOSE_NO_RESPONSE: 'Fica à vontade se quiser retomar depois 🙂',
    CLOSE_NOT_INTERESTED: 'Sem problema, obrigado pela sinceridade 🙂',
};

// ─── Template picker with variation ─────────────────────────
export function pickTemplate(templateId: string, variantSeed: number = 0): string {
    // Direct match first
    if (MESSAGE_TEMPLATES[templateId]) return MESSAGE_TEMPLATES[templateId];

    // Try base + alterations
    const alts = [
        `${templateId}_ALT_1`, `${templateId}_ALT_2`, `${templateId}_ALT_3`,
        `${templateId}_1`, `${templateId}_2`, `${templateId}_3`,
    ];
    const validAlts = alts.filter(k => MESSAGE_TEMPLATES[k]);
    if (validAlts.length > 0) {
        return MESSAGE_TEMPLATES[validAlts[variantSeed % validAlts.length]];
    }

    return ''; // Not found — will use LLM generation
}

// ─── Section 13.1 — Permitted Vocabulary ────────────────────
export const PERMITTED_EXPRESSIONS = [
    'te chamei', 'rapidinho', 'ser direta', 'faz sentido', 'quem vê isso',
    'falar certo', 'não te tomar tempo', 'canal próprio', 'pedido próprio',
    'taxa por pedido', 'sem mensalidade', 'no prático', 'conversa rápida',
    'operação', 'delivery', 'pedido organizado', 'te chamei por isso',
    'prometo ser objetiva', 'prefiro falar com a pessoa certa',
    'pra não te tomar tempo', 'isso é mais comum do que parece',
    'no prático fica mais claro', 'melhor te mostrar do que explicar por texto',
];

// ─── Section 13.2 — Absolute Blacklist ──────────────────────
export const FORBIDDEN_PATTERNS_ABSOLUTE = [
    // Corporate jargon from blacklist
    'otimizar processos', 'aumentar eficiência', 'alavancar', 'escalar',
    'solução completa', 'gestão integrada', 'plataforma robusta',
    'redução de custos', 'inovação', 'transformação digital', 'performance',
    'KPI', 'ROI', 'conversão garantida', 'sem esforço', 'sucesso garantido',
    // AI/bot language
    'como assistente', 'como inteligência artificial', 'sou um bot', 'algoritmo',
    'machine learning', 'inteligência artificial', 'como IA',
    // Corporate abstractions
    'sinergia', 'escalabilidade', 'disruptivo', 'paradigma', 'stakeholder',
    'roadmap', 'framework', 'mindset', 'benchmark', 'best practice',
    'facilitar operação', 'facilitar sua situação', 'solução inteligente',
    'gestão de tempo', 'maximização', 'retorno significativo',
    // Forbidden pitch (Section 2.3 of playbook)
    'sistema inovador', 'plataforma revolucionária', 'solução de escalabilidade',
    'automação disruptiva', 'otimização de processos', 'aumento garantido de vendas',
    // Motivational fluff
    'transformar sua vida', 'revolucionar', 'incrível oportunidade', 'oferta imperdível',
    'não perca essa chance', 'última chance', 'vagas limitadas',
    // Rule R9 — no false urgency
    'últimas vagas', 'promoção acaba hoje', 'só hoje', 'apenas 3 vagas',
    'compre agora', 'feche agora', 'aproveite já', 'somente hoje',
    'garanta já', 'promoção relâmpago',
    // Rule R8 — no guaranteed results
    'vai vender mais', 'vai dobrar vendas', 'garante lucro', 'vai substituir tudo',
    // Generic empty openers (Rule R5)
    'gostaria de informar', 'venho por meio desta', 'nesse sentido',
    'gostaríamos de apresentar', 'temos o prazer',
    // Rule R5 — no empty openers
    'oi tudo bem', 'como vai', 'tudo bem?',
    // Generic confirmations
    'que ótimo!', 'que bom!', 'maravilha!', 'perfeito!', 'entendo!',
    'compreendo', 'faz sentido.',
    // text wall indicators
    '1)', '2)', '3)', 'primeiro,', 'segundo,', 'terceiro,',
    '✅', '🚀', '💰', '📊', '🎯', '⭐',
];

// ─── Forbidden Regex Patterns ────────────────────────────────
export const FORBIDDEN_REGEX: RegExp[] = [
    /\b(clique|acesse|visite)\s+(o\s+)?(link|site|página)/i,
    /\b(segue|segure|veja)\s+(o|a|os|as)?\s*(lista|formulário|form)/i,
    /https?:\/\//i,     // No URLs
    /\d{2}[\/.]\\d{2}[\/.]\\d{4}/i, // No full dates
];

// ─── Section 13.3 — Useful Human Expressions ─────────────────
export const HUMAN_EXPRESSIONS = [
    'te chamei por isso', 'prometo ser objetiva', 'prefiro falar com a pessoa certa',
    'pra não te tomar tempo', 'isso é mais comum do que parece',
    'no prático fica mais claro', 'melhor te mostrar do que explicar por texto',
];

// ─── Semantic Cluster Interface ───────────────────────────────
export interface SemanticCluster {
    allowedVerbs: string[];
    allowedObjects: string[];
    allowedContexts: string[];
    examplePhrases: string[];
    humanExpressions: string[];
}

// ─── Strategy-specific Semantic Clusters ─────────────────────
const STRATEGY_SEMANTICS: Record<string, SemanticCluster> = {
    opening_primary: {
        allowedVerbs: ['te chamei', 'posso', 'falar', 'explicar', 'entrar em contato'],
        allowedObjects: ['mensalidade', 'taxa por pedido', 'canal próprio', 'delivery', 'rapidinho'],
        allowedContexts: ['deliveries', 'operação', 'canal de pedidos'],
        examplePhrases: ['Oi, sou Rafaela da equipe da Império Lord 🙂'],
        humanExpressions: ['te chamei porque', 'posso te explicar rapidinho', 'posso ser direta'],
    },
    opening_alt: {
        allowedVerbs: ['te chamei', 'posso', 'falar', 'ajudar', 'mostrar'],
        allowedObjects: ['mensalidade', 'taxa por pedido', 'canal próprio'],
        allowedContexts: ['delivery', 'operação', 'pedidos'],
        examplePhrases: ['Te chamei porque a gente ajuda deliveries'],
        humanExpressions: ['te chamei porque', 'pode fazer sentido pra vocês'],
    },
    followup_open: {
        allowedVerbs: ['ser objetiva', 'te explicar', 'falar', 'entender'],
        allowedObjects: ['canal próprio', 'mensalidade', 'taxa por pedido', 'operação'],
        allowedContexts: ['delivery', 'canal de pedidos', 'terceiros'],
        examplePhrases: ['Prometo ser objetiva:', 'Se não for você quem cuida'],
        humanExpressions: ['prometo ser objetiva', 'a ideia não é te tomar tempo', 'pra não te tomar tempo'],
    },
    low_friction_role_check: {
        allowedVerbs: ['cuida', 'decide', 'vê', 'cuida disso'],
        allowedObjects: ['delivery', 'parte do delivery', 'isso', 'essa parte'],
        allowedContexts: ['aí', 'da operação'],
        examplePhrases: ['Você que cuida dessa parte do delivery aí', 'Quem vê essa parte aí'],
        humanExpressions: ['quem vê isso', 'falar certo', 'cuida dessa parte'],
    },
    respectful_redirection: {
        allowedVerbs: ['falar', 'preferir', 'passar', 'certo'],
        allowedObjects: ['pessoa certa', 'responsável', 'quem decide', 'quem vê isso'],
        allowedContexts: ['pra não te tomar tempo', 'falar certo'],
        examplePhrases: ['Prefiro falar com a pessoa certa pra não te tomar tempo'],
        humanExpressions: ['prefiro falar com a pessoa certa', 'pra não te tomar tempo', 'falar certo'],
    },
    persistent_contact_capture: {
        allowedVerbs: ['passar', 'dar', 'me falar', 'consegue', 'pode'],
        allowedObjects: ['nome', 'número', 'cargo', 'horário', 'responsável'],
        allowedContexts: ['dessa parte', 'quem decide', 'quem cuida'],
        examplePhrases: ['Pode ser o número, o nome ou até o melhor horário'],
        humanExpressions: ['pra eu não ficar falando com a pessoa errada'],
    },
    binary_channel_choice: {
        allowedVerbs: ['têm', 'dependem', 'vêm', 'rodam', 'vendem'],
        allowedObjects: ['canal próprio', 'WhatsApp', 'iFood', 'pedidos', 'terceiros'],
        allowedContexts: ['hoje', 'na operação', 'os pedidos de vocês'],
        examplePhrases: ['Hoje vocês já têm canal próprio de pedidos ou dependem mais de WhatsApp/iFood?'],
        humanExpressions: ['canal próprio', 'dependem de terceiros'],
    },
    pain_confirmation: {
        allowedVerbs: ['fica', 'passa', 'depende', 'roda', 'funciona'],
        allowedObjects: ['canal de terceiro', 'atendimento manual', 'pedidos', 'taxa', 'canal próprio'],
        allowedContexts: ['ainda', 'bastante coisa', 'parte importante'],
        examplePhrases: ['Então ainda fica bastante coisa passando por canal de terceiro'],
        humanExpressions: ['entendi', 'então ainda', 'né?', 'certo?'],
    },
    value_bridge: {
        allowedVerbs: ['resolve', 'te chamei', 'faz', 'olhar'],
        allowedObjects: ['essa parte', 'isso', 'nossa estrutura', 'ponto', 'dependência'],
        allowedContexts: ['é justamente', 'foi por isso', 'exatamente o ponto'],
        examplePhrases: ['É justamente essa parte que a gente resolve.'],
        humanExpressions: ['é justamente essa parte', 'foi por isso que te chamei'],
    },
    trauma_handling: {
        allowedVerbs: ['entendo', 'passou', 'garanto', 'explicar', 'chamar', 'funciona'],
        allowedObjects: ['dor', 'diferença', 'resistência', 'sistema', 'proposta', 'modelo', 'situação', 'time'],
        allowedContexts: ['no nosso caso', 'quem já passou por', 'diferente', 'te ouvir melhor'],
        examplePhrases: ['Entendo bem essa dor. No nosso caso é diferente'],
        humanExpressions: ['faz total sentido', 'pior coisa é', 'a gente entende isso', 'aqui é diferente', 'não quer que dependa'],
    },
    value_short_pitch: {
        allowedVerbs: ['trabalha', 'vender', 'ter', 'organizar'],
        allowedObjects: ['canal próprio', 'site de pedidos', 'caixa básico', 'apoio de divulgação', 'mensalidade', 'taxa por pedido'],
        allowedContexts: ['pro delivery', 'sem mensalidade', 'sem taxa'],
        examplePhrases: ['canal próprio de pedidos, com site de pedidos, caixa básico e apoio de divulgação'],
        humanExpressions: ['sem mensalidade e sem taxa por pedido', 'canal próprio de pedidos'],
    },
    meeting_invite: {
        allowedVerbs: ['mostrar', 'ver', 'preferir', 'encaixa', 'fica melhor'],
        allowedObjects: ['hoje', 'amanhã', 'horário', 'conversa rápida', '15 a 25 minutos'],
        allowedContexts: ['no prático', 'de forma rápida', 'em poucos minutos'],
        examplePhrases: ['Melhor do que te explicar por texto é te mostrar isso no prático'],
        humanExpressions: ['no prático', 'conversa rápida', 'melhor te mostrar'],
    },
    no_time_recovery: {
        allowedVerbs: ['ser rápido', 'ficar', 'fica melhor', 'costuma ficar'],
        allowedObjects: ['horário', '15 a 25 minutos', 'conversa rápida'],
        allowedContexts: ['por isso mesmo', 'rápida', 'leve pra você'],
        examplePhrases: ['Por isso mesmo a conversa é rápida, de 15 a 25 minutos'],
        humanExpressions: ['por isso mesmo', 'conversa rápida', 'mais leve pra você'],
    },
    send_details_recovery: {
        allowedVerbs: ['adiantar', 'mostrar', 'entender', 'ver', 'servir'],
        allowedObjects: ['por aqui', 'prático', 'operação', 'minutos'],
        allowedContexts: ['no prático', 'mais claro', 'poucos minutos'],
        examplePhrases: ['no prático fica muito mais claro em poucos minutos'],
        humanExpressions: ['no prático fica mais claro', 'posso te adiantar por aqui'],
    },
    price_context_hold: {
        allowedVerbs: ['passar', 'entender', 'explicar', 'faz sentido'],
        allowedObjects: ['modelo', 'mensalidade', 'taxa por pedido', 'lógica', 'contexto'],
        allowedContexts: ['antes', 'porque', 'a lógica é bem diferente'],
        examplePhrases: ['Antes, só quis entender se esse modelo faz sentido'],
        humanExpressions: ['a lógica é bem diferente', 'antes de passar o valor'],
    },
    not_interested_recovery: {
        allowedVerbs: ['entender', 'é porque', 'vocês já têm', 'não é prioridade'],
        allowedObjects: ['interesse', 'prioridade', 'canal próprio', 'isso resolvido'],
        allowedContexts: ['vocês já têm isso resolvido', 'não é prioridade agora'],
        examplePhrases: ['é porque vocês já têm isso resolvido ou porque não é prioridade agora?'],
        humanExpressions: ['só pra eu entender', 'tranquilo'],
    },
    graceful_close: {
        allowedVerbs: ['agradecer', 'obrigado', 'valeu', 'fica à vontade'],
        allowedObjects: ['tempo', 'sinceridade', 'ajuda'],
        allowedContexts: ['sem problema', 'obrigado', 'valeu'],
        examplePhrases: ['Perfeito, valeu por me direcionar 🙂', 'Sem problema, obrigado pela sinceridade 🙂'],
        humanExpressions: ['valeu', 'sem problema', 'obrigado pela sinceridade'],
    },
};

// ─── Get Semantic Cluster ──────────────────────────────────────
export function getSemanticCluster(strategy: string, niche?: string | null): SemanticCluster {
    const base = STRATEGY_SEMANTICS[strategy] || STRATEGY_SEMANTICS['opening_primary'];
    return base;
}

// ─── Check Forbidden Patterns ─────────────────────────────────
export function checkForbiddenPatterns(text: string): string[] {
    const violations: string[] = [];

    for (const pattern of FORBIDDEN_PATTERNS_ABSOLUTE) {
        // Escape special chars except word boundaries, use \b to match exact words rather than substrings
        const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(text)) {
            violations.push(`contains forbidden phrase: "${pattern}"`);
        }
    }

    for (const regex of FORBIDDEN_REGEX) {
        if (regex.test(text)) {
            violations.push(`matches forbidden regex: ${regex.source}`);
        }
    }

    return violations;
}

// ─── Build Semantic Instruction for LLM ──────────────────────
export function buildSemanticInstruction(cluster: SemanticCluster): string {
    const lines: string[] = [];
    lines.push(`VOCABULÁRIO PERMITIDO:`);
    lines.push(`- Verbos/Ações: ${cluster.allowedVerbs.slice(0, 6).join(', ')}`);
    lines.push(`- Objetos/conceitos: ${cluster.allowedObjects.slice(0, 6).join(', ')}`);
    lines.push(`- Contextos: ${cluster.allowedContexts.slice(0, 4).join(', ')}`);
    lines.push('');
    lines.push(`EXPRESSÕES HUMANAS RECOMENDADAS:`);
    for (const expr of cluster.humanExpressions.slice(0, 5)) {
        lines.push(`- "${expr}"`);
    }
    lines.push('');
    lines.push(`EXEMPLOS DE REFERÊNCIA (inspira, não copia):`);
    for (const ex of cluster.examplePhrases.slice(0, 3)) {
        lines.push(`- "${ex}"`);
    }
    return lines.join('\n');
}
