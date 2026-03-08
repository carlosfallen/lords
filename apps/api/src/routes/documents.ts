// ============================================================
// Document Routes — Real Database Queries
// ============================================================
import { db, documents, tenants, users } from 'db';
import { eq, desc, ilike } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const documentRoutes: RouteEntry[] = [
    ['GET', '/api/documents', async (req) => {
        const url = new URL(req.url);
        const tenantId = url.searchParams.get('tenantId') || '';

        const conditions: any[] = [];
        if (tenantId) conditions.push(eq(documents.tenantId, tenantId));

        const docs = await db.select({
            id: documents.id,
            name: documents.name,
            category: documents.category,
            mimeType: documents.mimeType,
            fileUrl: documents.fileUrl,
            fileSize: documents.fileSize,
            version: documents.version,
            createdAt: documents.createdAt,
            tenantName: tenants.name,
            uploadedBy: users.name,
        }).from(documents)
            .leftJoin(tenants, eq(documents.tenantId, tenants.id))
            .leftJoin(users, eq(documents.uploadedByUserId, users.id))
            .where(conditions.length > 0 ? conditions[0] : undefined)
            .orderBy(desc(documents.createdAt));

        return Response.json({ success: true, data: docs });
    }],

    ['POST', '/api/documents', async (req) => {
        const body = await req.json();
        const user = (req as any)._user;

        const [newDoc] = await db.insert(documents).values({
            tenantId: body.tenantId,
            name: body.name,
            category: body.category,
            mimeType: body.mimeType,
            fileUrl: body.fileUrl,
            fileSize: body.fileSize,
            uploadedByUserId: user?.sub,
        }).returning();

        return Response.json({ success: true, data: newDoc }, { status: 201 });
    }],
];
