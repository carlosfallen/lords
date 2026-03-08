

export interface AiModel {
    id: string;
    name: string;
    provider: 'openai' | 'groq' | 'gemini' | 'ollama';
}

export class AiModelsService {
    async getAvailableModels(): Promise<AiModel[]> {
        const models: AiModel[] = [];

        // 1. OpenAI
        if (process.env.OPENAI_API_KEY) {
            try {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
                });
                if (res.ok) {
                    const data: any = await res.json();
                    const openAiModels = data.data
                        .filter((m: any) => m.id.startsWith('gpt-') || m.id.includes('o1'))
                        .map((m: any) => ({
                            id: m.id,
                            name: m.id,
                            provider: 'openai' as const
                        }));
                    models.push(...openAiModels);
                }
            } catch (e) {
                console.error('[AiModelsService] Failed to fetch OpenAI models:', e);
            }
        }

        // 2. Groq
        if (process.env.GROQ_API_KEY) {
            try {
                const res = await fetch('https://api.groq.com/openai/v1/models', {
                    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }
                });
                if (res.ok) {
                    const data: any = await res.json();
                    const groqModels = data.data.map((m: any) => ({
                        id: m.id,
                        name: `${m.id} (Groq)`,
                        provider: 'groq' as const
                    }));
                    models.push(...groqModels);
                }
            } catch (e) {
                console.error('[AiModelsService] Failed to fetch Groq models:', e);
            }
        }

        // 3. Gemini (Google AI)
        if (process.env.GEMINI_API_KEY) {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
                if (res.ok) {
                    const data: any = await res.json();
                    const geminiModels = data.models
                        .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
                        .map((m: any) => ({
                            id: m.name.replace('models/', ''),
                            name: m.displayName,
                            provider: 'gemini' as const
                        }));
                    models.push(...geminiModels);
                }
            } catch (e) {
                console.error('[AiModelsService] Failed to fetch Gemini models:', e);
            }
        }

        // 4. Ollama (Local)
        const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        try {
            const res = await fetch(`${ollamaUrl}/api/tags`);
            if (res.ok) {
                const data: any = await res.json();
                const ollamaModels = data.models.map((m: any) => ({
                    id: m.name,
                    name: `${m.name} (Local)`,
                    provider: 'ollama' as const
                }));
                models.push(...ollamaModels);
            }
        } catch (e) {
            // Silently ignore if Ollama is not running
        }

        return models;
    }
}

export const aiModelsService = new AiModelsService();
