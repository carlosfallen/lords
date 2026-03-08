// ============================================================
// Wiki Routes (Base de Conhecimento)
// ============================================================
import { db, wikiArticles, users } from 'db';
import { desc, eq, like, or } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const wikiRoutes: RouteEntry[] = [
    ['GET', '/api/wiki', async (req) => {
        const url = new URL(req.url);
        const search = url.searchParams.get('q');

        // Base query
        let query = db.select({
            id: wikiArticles.id,
            title: wikiArticles.title,
            category: wikiArticles.category,
            content: wikiArticles.content,
            tags: wikiArticles.tags,
            createdAt: wikiArticles.createdAt,
            authorName: users.name,
        }).from(wikiArticles).leftJoin(users, eq(wikiArticles.authorId, users.id));

        // Search filter
        if (search) {
            query = query.where(
                or(
                    like(wikiArticles.title, `%${search}%`),
                    like(wikiArticles.content, `%${search}%`),
                    like(wikiArticles.category, `%${search}%`)
                )
            ) as any;
        }

        const articles = await query.orderBy(desc(wikiArticles.createdAt)).limit(50);
        return Response.json({ success: true, data: articles });
    }],
    ['GET', '/api/wiki/:id', async (req, params) => {
        const [article] = await db.select({
            id: wikiArticles.id,
            title: wikiArticles.title,
            category: wikiArticles.category,
            content: wikiArticles.content,
            tags: wikiArticles.tags,
            createdAt: wikiArticles.createdAt,
            authorName: users.name,
        }).from(wikiArticles)
            .leftJoin(users, eq(wikiArticles.authorId, users.id))
            .where(eq(wikiArticles.id, params.id));

        if (!article) return Response.json({ success: false, error: 'Article not found' }, { status: 404 });
        return Response.json({ success: true, data: article });
    }],
];
