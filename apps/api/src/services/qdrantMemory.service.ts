import { aiOrchestratorService } from './aiOrchestrator.service';
import * as crypto from 'crypto';

const QDRANT_URL = process.env.QDRANT_HTTP_URL || 'http://localhost:6333';
const COLLECTION_NAME = 'lead_memory';

export class QdrantMemoryService {
    async getLeadMemory(phone: string, limit: number = 3): Promise<string> {
        try {
            const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points/scroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filter: {
                        must: [
                            { key: 'phone', match: { value: phone } },
                            { key: 'is_summary', match: { value: true } }
                        ]
                    },
                    limit,
                    with_payload: true
                })
            });

            if (!res.ok) return '';
            const data = await res.json();
            if (!data.result || !data.result.points || data.result.points.length === 0) return '';

            const summaries = data.result.points.map((p: any) => p.payload?.text).filter(Boolean);
            return summaries.join('\n');
        } catch (e) {
            console.error('[Qdrant API] Error fetching memory', e);
            return '';
        }
    }

    async saveLeadMemorySummary(phone: string, tenantId: string, history: any[], outcome: string): Promise<void> {
        try {
            const conversation = history.map(h => `${h.role}: ${h.content}`).join('\n');
            const sysPrompt = `Resuma a prospecção em português. Desfecho: ${outcome}. Foque no negócio, dores e qual objeção impediu o avanço (se houver). Máximo 4 linhas reais.`;

            const summaryText = await aiOrchestratorService.chat([
                { role: 'system', content: sysPrompt },
                { role: 'user', content: `Histórico:\n${conversation}` }
            ], 'commercial', { temperature: 0.3, max_tokens: 150 });

            // Zero vector of 1024 dimensions since we rely on payload filtering
            // BGEM3 from rust uses 1024.
            const zeroVector = new Array(1024).fill(0.0);
            const pointId = crypto.randomUUID();

            const res = await fetch(`${QDRANT_URL}/collections/${COLLECTION_NAME}/points`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    points: [{
                        id: pointId,
                        vector: zeroVector,
                        payload: {
                            phone,
                            tenant_id: tenantId,
                            text: `[SUMÁRIO ANTERIOR - Desfecho: ${outcome}] ${summaryText}`,
                            is_summary: true,
                            timestamp: Date.now()
                        }
                    }]
                })
            });

            if (!res.ok) {
                console.error('[Qdrant API] Failed to save summary:', await res.text());
            } else {
                console.log(`[Qdrant API] Saved memory summary for ${phone}`);
            }

        } catch (e) {
            console.error('[Qdrant API] Save memory exception', e);
        }
    }
}

export const qdrantMemoryService = new QdrantMemoryService();
