// ================================================================
// Prospecting State Extractor — Playbook v1.0
// Implements: Section 11 — State Extraction Schema
// Extracts structured state from conversation context
// ================================================================

import { aiOrchestratorService } from './aiOrchestrator.service';
import type { ProspectingState } from './prospectConversationState.service';
import {
    loadConversationHistory,
    loadProspectingState,
    saveProspectingState,
} from './prospectConversationState.service';

// ─── Extraction Result Schema (Section 11) ────────────────────
interface ExtractionResult {
    routeType: 'responsible' | 'non_responsible' | 'unknown';
    leadRoleDetected: 'owner' | 'manager' | 'attendant' | 'receptionist' | 'unknown';
    responsibleDetected: boolean;
    responsibleName: string | null;
    businessName: string | null;
    responsibleRole: string | null;
    responsiblePhone: string | null;
    bestContactTime: string | null;
    currentOrderChannel: 'whatsapp' | 'ifood' | 'mixed' | 'own_channel' | 'manual' | 'unknown';
    hasOwnChannel: 'yes' | 'no' | 'partial' | 'unknown';
    painType: Array<'dependency_on_platforms' | 'margin_loss' | 'manual_attendance' | 'lack_of_control'>;
    interestLevel: 'low' | 'medium' | 'high' | 'unknown';
    opportunityScore: number;
    meetingStatus: 'none' | 'exploring' | 'proposed' | 'confirmed';
    proposedTime: string | null;
    conversationOutcome: 'in_progress' | 'responsible_contact_captured' | 'meeting_confirmed' | 'blocked' | 'not_interested' | 'no_response';
    lastMeaningfulStep: string;
    shouldCloseCurrentThread: boolean;
    requiresHumanFollowup: boolean;
    conversationSummary: string;
}

/**
 * Asynchronously extracts structured state from conversation history
 * and patches the lead's prospecting metadata. (Section 11 of Playbook)
 */
export async function extractProspectingStateAsync(leadId: string): Promise<void> {
    try {
        const { state } = await loadProspectingState(leadId);
        const history = await loadConversationHistory(leadId, 8);

        if (history.length < 2) return;

        const prompt = buildExtractionPrompt(state);

        const messages = [
            { role: 'system', content: prompt },
            ...history.map(m => ({ role: m.role as any, content: m.content }))
        ];

        const jsonString = await aiOrchestratorService.chat(messages, 'prospecting', {
            temperature: 0.1,
            max_tokens: 400,
        });

        // Parse JSON — some providers may wrap in markdown, so extract from first '{' to last '}'
        let jsonToParse = jsonString.trim();
        const jsonMatch = jsonToParse.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonToParse = jsonMatch[0];
        const extraction: ExtractionResult = JSON.parse(jsonToParse);

        // Apply extraction results to state (Section 11 rules)
        const patch: Partial<ProspectingState> = {};

        // routeType
        if (extraction.routeType !== 'unknown' || !state.routeType || state.routeType === 'unknown') {
            patch.routeType = extraction.routeType;
        }

        // leadRoleDetected
        if (extraction.leadRoleDetected !== 'unknown') {
            patch.leadRoleDetected = extraction.leadRoleDetected;
        }

        // Responsible and Business Context
        if (extraction.responsibleDetected) {
            patch.responsibleDetected = true;
        }
        if (extraction.responsibleName) patch.responsibleName = extraction.responsibleName;
        if (extraction.businessName) patch.businessName = extraction.businessName;
        if (extraction.responsibleRole) patch.responsibleRole = extraction.responsibleRole;
        if (extraction.responsiblePhone) patch.responsiblePhone = extraction.responsiblePhone;
        if (extraction.bestContactTime) patch.bestContactTime = extraction.bestContactTime;

        // Channel info
        if (extraction.currentOrderChannel !== 'unknown') {
            patch.currentOrderChannel = extraction.currentOrderChannel;
        }
        if (extraction.hasOwnChannel !== 'unknown') {
            patch.hasOwnChannel = extraction.hasOwnChannel;
        }

        // Pain types (additive — don't overwrite)
        if (extraction.painType.length > 0) {
            const existing = new Set(state.painType);
            for (const p of extraction.painType) existing.add(p);
            patch.painType = Array.from(existing) as any;
        }

        // Interest level
        if (extraction.interestLevel !== 'unknown') {
            patch.interestLevel = extraction.interestLevel;
        }

        // Opportunity Score (0-100)
        if (typeof extraction.opportunityScore === 'number') {
            patch.opportunityScore = extraction.opportunityScore;
        }

        // Meeting status (only advance, never downgrade)
        const meetingOrder = ['none', 'exploring', 'proposed', 'confirmed'];
        const currentMeetingIdx = meetingOrder.indexOf(state.meetingStatus);
        const newMeetingIdx = meetingOrder.indexOf(extraction.meetingStatus);
        if (newMeetingIdx > currentMeetingIdx) {
            patch.meetingStatus = extraction.meetingStatus;
            if (extraction.meetingStatus === 'confirmed') {
                patch.confirmedTime = extraction.proposedTime;
                patch.requiresHumanFollowup = true;
            } else if (extraction.proposedTime) {
                patch.proposedTime = extraction.proposedTime;
            }
        }

        // Conversation outcome
        if (extraction.conversationOutcome !== 'in_progress') {
            patch.conversationOutcome = extraction.conversationOutcome;
        }

        // Thread closure
        if (extraction.shouldCloseCurrentThread) {
            patch.shouldCloseCurrentThread = true;
        }

        // Human followup
        if (extraction.requiresHumanFollowup) {
            patch.requiresHumanFollowup = true;
        }

        // Summary
        if (extraction.conversationSummary) {
            patch.conversationSummary = extraction.conversationSummary;
        }

        // Meaningful step
        if (extraction.lastMeaningfulStep) {
            patch.lastMeaningfulStep = extraction.lastMeaningfulStep;
        }

        // Apply patch
        const updatedState: ProspectingState = { ...state, ...patch };
        await saveProspectingState(leadId, updatedState);

        console.log(`[StateExtractor] Lead ${leadId}: state=${updatedState.conversationState}, route=${updatedState.routeType}, meeting=${updatedState.meetingStatus}, outcome=${updatedState.conversationOutcome}`);

    } catch (e: any) {
        console.error(`[StateExtractor] Failed for ${leadId}:`, e?.message);
    }
}

// ─── Build Extraction Prompt ─────────────────────────────────
function buildExtractionPrompt(state: ProspectingState): string {
    return `
Você é um analista extrator de estado de uma conversa comercial via WhatsApp.
O vendedor (assistant) é Rafaela, da Império Lord, prospectando deliveries para oferecer:
- canal próprio de pedidos
- sem mensalidade
- sem taxa por pedido
- caixa básico
- apoio de divulgação

ESTADO ATUAL DETECTADO:
- Rota: ${state.routeType}
- Estado da conversa: ${state.conversationState}
- Status da reunião: ${state.meetingStatus}
- Resultado atual: ${state.conversationOutcome}

Extraia o estado ATUAL da conversa e retorne UM objeto JSON com exatamente estes campos:

{
  "routeType": "responsible" | "non_responsible" | "unknown",
  "leadRoleDetected": "owner" | "manager" | "attendant" | "receptionist" | "unknown",
  "responsibleDetected": boolean,
  "responsibleName": string | null,
  "businessName": string | null,
  "responsibleRole": string | null,
  "responsiblePhone": string | null,
  "bestContactTime": string | null,
  "currentOrderChannel": "whatsapp" | "ifood" | "mixed" | "own_channel" | "manual" | "unknown",
  "hasOwnChannel": "yes" | "no" | "partial" | "unknown",
  "painType": [],
  "interestLevel": "low" | "medium" | "high" | "unknown",
  "opportunityScore": number,
  "meetingStatus": "none" | "exploring" | "proposed" | "confirmed",
  "proposedTime": string | null,
  "conversationOutcome": "in_progress" | "responsible_contact_captured" | "meeting_confirmed" | "blocked" | "not_interested" | "no_response",
  "lastMeaningfulStep": "opening" | "role_check" | "responsible_capture" | "diagnosis" | "value_presented" | "meeting_proposed",
  "shouldCloseCurrentThread": boolean,
  "requiresHumanFollowup": boolean,
  "conversationSummary": string
}

REGRAS DE EXTRAÇÃO (Section 11 do playbook):

responsibleDetected = true quando lead disser: "sou eu", "eu cuido", "eu vejo isso", "eu decido", "sou o dono", "sou gerente"
routeType = "non_responsible" quando lead disser: "não sou eu", "quem vê isso é X", "o dono vê", "sou só atendente", "sou recepção"
conversationOutcome = "responsible_contact_captured" quando houver: nome útil do responsável, número do responsável, cargo + horário, ou encaminhamento confirmado
meetingStatus = "proposed" quando bot convidar para reunião
meetingStatus = "confirmed" quando houver aceite explícito ou horário definido pelo lead
shouldCloseCurrentThread = true quando: outcome for "responsible_contact_captured" OU "meeting_confirmed" OU lead pedir para parar OU lead demonstrar desinteresse claro 2x
requiresHumanFollowup = true quando: meeting_confirmed, ou lead pedir humano, ou pergunta técnica complexa
painType - pode incluir: "dependency_on_platforms" (usa ifood/whatsapp), "margin_loss" (perdendo % em taxa), "manual_attendance" (atendimento manual), "lack_of_control" (sem controle dos pedidos)
businessName - o nome do negócio do lead se ele mencionar (ex: "Aqui é da Pizzaria X", "Lanchonete Y")
opportunityScore - Nota de 0 a 100 de quão aquecido e propenso a compra esse lead está agora. Baseie em: Responsável detectado (+20), Responde rápido (+10), Demonstra interesse alto (+30), Reclama muito das taxas do iFood (+20).

Retorne EXCLUSIVAMENTE o JSON, sem texto adicional.
`.trim();
}
