export interface AiProviderStatus {
    id: 'claude' | 'openai' | 'groq' | 'groq_70b' | 'gemini' | 'ollama';
    status: 'online' | 'rate_limited' | 'offline';
    lastChecked: Date;
    error?: string;
}

export interface GenerationParams {
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    max_tokens?: number;
}

// Default params for each objective
const DEFAULT_PARAMS: Record<string, GenerationParams> = {
    commercial: { temperature: 0.7, max_tokens: 150 },
    prospecting: { temperature: 0.55, top_p: 0.85, frequency_penalty: 0.4, presence_penalty: 0.2, max_tokens: 100 },
};

export class AiOrchestratorService {
    private providerStatus: Record<string, AiProviderStatus> = {
        claude: { id: 'claude', status: 'online', lastChecked: new Date() },
        openai: { id: 'openai', status: 'online', lastChecked: new Date() },
        groq: { id: 'groq', status: 'online', lastChecked: new Date() },
        groq_70b: { id: 'groq_70b', status: 'online', lastChecked: new Date() },
        gemini: { id: 'gemini', status: 'online', lastChecked: new Date() },
        ollama: { id: 'ollama', status: 'online', lastChecked: new Date() },
    };

    private rateLimitRecoveryMs = 60000; // 1 minute

    async chat(
        messages: any[],
        objective: 'commercial' | 'prospecting' = 'commercial',
        overrideParams?: GenerationParams,
    ): Promise<string> {
        const chain = this.getProviderChain(objective);
        const params = { ...DEFAULT_PARAMS[objective], ...(overrideParams || {}) };
        let lastError = '';

        for (const providerId of chain) {
            if (this.isProviderDegraded(providerId)) continue;

            try {
                const response = await this.callProvider(providerId, messages, params);
                this.updateStatus(providerId, 'online');
                return response;
            } catch (err: any) {
                lastError = err.message || 'Unknown error';
                console.error(`[AiOrchestrator] Provider ${providerId} failed:`, lastError);

                if (err.status === 429) {
                    this.updateStatus(providerId, 'rate_limited', 'Rate limit hit');
                } else {
                    this.updateStatus(providerId, 'offline', lastError);
                }
                // Continue to next provider in chain
            }
        }

        throw new Error(`All AI providers failed. Last error: ${lastError}`);
    }

    getStatuses(): AiProviderStatus[] {
        return Object.values(this.providerStatus);
    }

    private getProviderChain(objective: string): string[] {
        if (objective === 'prospecting') {
            return ['claude', 'openai', 'groq_70b', 'gemini', 'ollama'];
        }
        return ['groq', 'openai', 'gemini', 'ollama'];
    }

    private isProviderDegraded(id: string): boolean {
        const stat = this.providerStatus[id];
        if (stat.status === 'online') return false;

        // Check if enough time has passed to retry a rate-limited provider
        if (stat.status === 'rate_limited') {
            const now = new Date().getTime();
            const last = stat.lastChecked.getTime();
            if (now - last > this.rateLimitRecoveryMs) {
                return false; // Give it another chance
            }
        }

        return true;
    }

    private updateStatus(id: string, status: AiProviderStatus['status'], error?: string) {
        this.providerStatus[id] = {
            id: id as any,
            status,
            lastChecked: new Date(),
            error
        };
    }

    private async callProvider(id: string, messages: any[], params: GenerationParams): Promise<string> {
        switch (id) {
            case 'claude': return this.callClaude(messages, params);
            case 'openai': return this.callOpenAi(messages, params);
            case 'groq': return this.callGroq(messages, params);
            case 'groq_70b': return this.callGroq70b(messages, params);
            case 'gemini': return this.callGemini(messages, params);
            case 'ollama': return this.callOllama(messages, params);
            default: throw new Error(`Unknown provider: ${id}`);
        }
    }

    private async callClaude(messages: any[], params: GenerationParams): Promise<string> {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) throw new Error('Short-circuit: No Anthropic Key');

        const systemParts = messages
            .filter(m => m.role === 'system')
            .map(m => m.content);
        const systemContent = systemParts.join('\n');

        const conversationMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({ role: m.role, content: m.content }));

        if (conversationMessages.length === 0) {
            conversationMessages.push({ role: 'user', content: 'Gere a mensagem.' });
        }

        const body: any = {
            model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
            max_tokens: params.max_tokens || 120,
            messages: conversationMessages,
        };

        if (systemContent) {
            body.system = systemContent;
        }

        if (params.temperature !== undefined) {
            body.temperature = Math.min(1.0, params.temperature);
        }

        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const errText = await res.text();
            throw { status: res.status, message: errText };
        }

        const data = await res.json();
        const textBlock = data.content?.find((b: any) => b.type === 'text');
        if (!textBlock?.text) {
            throw new Error('Claude: resposta sem bloco de texto');
        }

        return textBlock.text;
    }

    private async callGroq70b(messages: any[], params: GenerationParams): Promise<string> {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('Short-circuit: No Groq Key');

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages,
                temperature: params.temperature,
                top_p: params.top_p,
                max_tokens: params.max_tokens,
            })
        });

        if (!res.ok) throw { status: res.status, message: await res.text() };
        const data = await res.json();
        return data.choices[0].message.content;
    }

    private async callOpenAi(messages: any[], params: GenerationParams): Promise<string> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('Short-circuit: No OpenAI Key');

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                temperature: params.temperature,
                top_p: params.top_p,
                frequency_penalty: params.frequency_penalty,
                presence_penalty: params.presence_penalty,
                max_tokens: params.max_tokens,
            })
        });

        if (!res.ok) throw { status: res.status, message: await res.text() };
        const data = await res.json();
        return data.choices[0].message.content;
    }

    private async callGroq(messages: any[], params: GenerationParams): Promise<string> {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('Short-circuit: No Groq Key');

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                messages,
                temperature: params.temperature,
                top_p: params.top_p,
                frequency_penalty: params.frequency_penalty,
                presence_penalty: params.presence_penalty,
                max_tokens: params.max_tokens,
            })
        });

        if (!res.ok) throw { status: res.status, message: await res.text() };
        const data = await res.json();
        return data.choices[0].message.content;
    }

    private async callGemini(messages: any[], params: GenerationParams): Promise<string> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('Short-circuit: No Gemini Key');

        // Build proper Gemini contents from messages array
        const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
        const systemInstruction = systemParts.length > 0 ? systemParts.join('\n') : '';
        const conversationParts = messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

        const body: any = {
            contents: conversationParts.length > 0 ? conversationParts : [{ role: 'user', parts: [{ text: 'Gere a mensagem.' }] }],
            generationConfig: {
                temperature: params.temperature,
                topP: params.top_p,
                maxOutputTokens: params.max_tokens,
            },
        };

        if (systemInstruction) {
            body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw { status: res.status, message: await res.text() };
        const data = await res.json();
        return data.candidates[0].content.parts[0].text;
    }

    private async callOllama(messages: any[], params: GenerationParams): Promise<string> {
        const url = process.env.OLLAMA_URL || 'http://localhost:11434';
        const res = await fetch(`${url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3',
                messages,
                stream: false,
                options: {
                    temperature: params.temperature,
                    top_p: params.top_p,
                    num_predict: params.max_tokens,
                },
            })
        });

        if (!res.ok) throw { status: res.status, message: await res.text() };
        const data = await res.json();
        return data.message.content;
    }
}

export const aiOrchestratorService = new AiOrchestratorService();
