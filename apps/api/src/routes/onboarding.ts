// ============================================================
// Onboarding Routes
// ============================================================
import { db, onboardingProcesses, tenants } from 'db';
import { desc, eq } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const onboardingRoutes: RouteEntry[] = [
    ['GET', '/api/onboarding', async () => {
        const processes = await db.select({
            id: onboardingProcesses.id,
            tenantId: onboardingProcesses.tenantId,
            tenantName: tenants.tradeName,
            status: onboardingProcesses.status,
            startedAt: onboardingProcesses.startedAt,
            completedAt: onboardingProcesses.completedAt,
            checklist: onboardingProcesses.checklist,
        }).from(onboardingProcesses)
            .leftJoin(tenants, eq(onboardingProcesses.tenantId, tenants.id))
            .orderBy(desc(onboardingProcesses.startedAt));

        return Response.json({ success: true, data: processes });
    }],
    ['GET', '/api/onboarding/:id', async (req, params) => {
        const [processInfo] = await db.select({
            id: onboardingProcesses.id,
            tenantName: tenants.tradeName,
            checklist: onboardingProcesses.checklist,
        }).from(onboardingProcesses)
            .leftJoin(tenants, eq(onboardingProcesses.tenantId, tenants.id))
            .where(eq(onboardingProcesses.id, params.id));

        if (!processInfo) return Response.json({ success: false, error: 'Onboarding not found' }, { status: 404 });
        return Response.json({ success: true, data: processInfo });
    }],
    ['POST', '/api/onboarding/client-submit', async (req) => {
        try {
            const body = await req.json();
            const { tenantId, config } = body;

            if (!tenantId || !config) {
                return Response.json({ success: false, error: 'Tenant ID and config are required' }, { status: 400 });
            }

            // Update Tenant basic info (Trade Name)
            if (config.companyName) {
                await db.update(tenants)
                    .set({ tradeName: config.companyName, updatedAt: new Date() })
                    .where(eq(tenants.id, tenantId));
            }

            // Update Onboarding Process
            await db.update(onboardingProcesses)
                .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
                .where(eq(onboardingProcesses.tenantId, tenantId));

            return Response.json({ success: true, message: 'Onboarding configuration saved successfully.' });
        } catch (error) {
            console.error('Error saving onboarding config:', error);
            return Response.json({ success: false, error: 'Failed to save configuration.' }, { status: 500 });
        }
    }],
];
