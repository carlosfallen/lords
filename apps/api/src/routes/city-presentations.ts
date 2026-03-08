// ============================================================
// City Presentations — CRM Routes
// ============================================================
import { db, cityPresentations } from 'db';
import { eq, desc } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const cityPresentationRoutes: RouteEntry[] = [
    // List all city presentations
    ['GET', '/api/city-presentations', async () => {
        const presentations = await db.select().from(cityPresentations)
            .orderBy(cityPresentations.cidade);
        return Response.json({ success: true, data: presentations });
    }],

    // Get by city name
    ['GET', '/api/city-presentations/:cidade', async (req, params) => {
        const cidade = decodeURIComponent(params.cidade);
        const [pres] = await db.select().from(cityPresentations)
            .where(eq(cityPresentations.cidade, cidade));

        if (!pres) return Response.json({ success: false, error: 'No presentation for this city' }, { status: 404 });
        return Response.json({ success: true, data: pres });
    }],

    // Create — Admin only
    ['POST', '/api/city-presentations', async (req) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Admin only' }, { status: 403 });
        }

        const body = await req.json();
        if (!body.cidade || !body.link) {
            return Response.json({ success: false, error: 'cidade and link are required' }, { status: 400 });
        }

        const [pres] = await db.insert(cityPresentations).values({
            cidade: body.cidade,
            link: body.link,
            ativo: body.ativo !== false,
            updatedByAdminId: user.sub,
        }).returning();

        return Response.json({ success: true, data: pres }, { status: 201 });
    }],

    // Update — Admin only
    ['PUT', '/api/city-presentations/:id', async (req, params) => {
        const user = (req as any)._user;
        if (!['admin', 'super_admin'].includes(user?.role)) {
            return Response.json({ success: false, error: 'Admin only' }, { status: 403 });
        }

        const body = await req.json();
        const [updated] = await db.update(cityPresentations).set({
            ...body,
            updatedAt: new Date(),
            updatedByAdminId: user.sub,
        }).where(eq(cityPresentations.id, params.id)).returning();

        if (!updated) return Response.json({ success: false, error: 'Not found' }, { status: 404 });
        return Response.json({ success: true, data: updated });
    }],
];
