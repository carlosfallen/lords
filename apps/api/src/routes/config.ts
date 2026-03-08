// ============================================================
// Config Routes — Bot & AI Settings
// ============================================================
import { db, tenants } from 'db';
import { eq } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const configRoutes: RouteEntry[] = [
    ['GET', '/api/config/bot', async (req) => {
        const user = (req as any)._user;
        const tenantId = user?.tenantId || (user?.role === 'super_admin' ? process.env.TENANT_ID : null);

        if (!tenantId) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

        // Mocking settings from metadata or env for now as we don't have a dedicated table yet
        // In a real scenario, these would be in a `bot_settings` table
        const metadata = (tenant?.metadata as any) || {};

        return Response.json({
            success: true,
            data: {
                engine: {
                    rustStatus: 'online', // Would check health endpoint
                    qdrantStatus: 'online',
                    waStatus: 'connected',
                },
                commercial: {
                    persona: metadata.commercialPersona || 'Diretor Comercial da Império Lord',
                    model: metadata.commercialModel || process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                    confidenceThreshold: metadata.confidenceThreshold || 0.85,
                    groqKey: process.env.GROQ_API_KEY ? 'active (masked)' : 'missing',
                },
                prospecting: {
                    model: metadata.prospectingModel || 'gpt-4o-mini',
                },
                system: {
                    openAiKey: metadata.openAiKey || '',
                    geminiKey: metadata.geminiKey || '',
                    groqKey: metadata.groqKey || '',
                },
                local: {
                    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
                    ollamaStatus: 'online',
                    onnxModel: 'BGE-M3 (FastEmbed)',
                }
            }
        });
    }],

    ['POST', '/api/config/bot', async (req) => {
        const user = (req as any)._user;
        const tenantId = user?.tenantId || (user?.role === 'super_admin' ? process.env.TENANT_ID : null);

        if (!tenantId) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

        const newMetadata = {
            ...(tenant?.metadata as any || {}),
            commercialPersona: body.commercial?.persona,
            commercialModel: body.commercial?.model,
            confidenceThreshold: body.commercial?.confidenceThreshold,
            prospectingModel: body.prospecting?.model,
            openAiKey: body.system?.openAiKey,
            geminiKey: body.system?.geminiKey,
            groqKey: body.system?.groqKey,
        };

        await db.update(tenants)
            .set({ metadata: newMetadata, updatedAt: new Date() })
            .where(eq(tenants.id, tenantId));

        return Response.json({ success: true, message: 'Settings updated' });
    }],

    ['GET', '/api/config/models', async (req) => {
        const { aiModelsService } = await import('../services/aiModels.service');
        const models = await aiModelsService.getAvailableModels();
        return Response.json({ success: true, data: models });
    }],

    ['GET', '/api/config/ai-status', async (req) => {
        const { aiOrchestratorService } = await import('../services/aiOrchestrator.service');
        return Response.json({ success: true, data: aiOrchestratorService.getStatuses() });
    }],
];
