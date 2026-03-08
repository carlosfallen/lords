// ============================================================
// Ideas Routes
// ============================================================
import { db, ideas, users } from 'db';
import { desc, eq } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const ideaRoutes: RouteEntry[] = [
    ['GET', '/api/ideas', async () => {
        const result = await db.select({
            id: ideas.id,
            title: ideas.title,
            description: ideas.description,
            status: ideas.status,
            upvotes: ideas.upvotes,
            createdAt: ideas.createdAt,
            authorName: users.name,
        }).from(ideas)
            .leftJoin(users, eq(ideas.submittedByUserId, users.id))
            .orderBy(desc(ideas.upvotes));

        return Response.json({ success: true, data: result });
    }],
    ['POST', '/api/ideas/:id/upvote', async (req, params) => {
        // Find existing upvotes
        const [idea] = await db.select({ upvotes: ideas.upvotes }).from(ideas).where(eq(ideas.id, params.id));
        if (!idea) return Response.json({ success: false, error: 'Idea not found' }, { status: 404 });

        const [updated] = await db.update(ideas)
            .set({ upvotes: (idea.upvotes || 0) + 1 })
            .where(eq(ideas.id, params.id))
            .returning();

        return Response.json({ success: true, data: updated });
    }],
];
