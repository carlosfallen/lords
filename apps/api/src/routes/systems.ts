// ============================================================
// Systems Routes (Fábrica de Sistemas)
// ============================================================
import { db, systemTemplates } from 'db';
import { desc } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const systemRoutes: RouteEntry[] = [
    ['GET', '/api/systems', async () => {
        const templates = await db.select().from(systemTemplates).orderBy(desc(systemTemplates.createdAt));
        return Response.json({ success: true, data: templates });
    }],
];
