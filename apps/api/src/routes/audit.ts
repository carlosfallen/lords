// ============================================================
// Audit Routes — Real Database Queries + Utility
// ============================================================
import { db, auditLogs, users } from 'db';
import { desc, eq } from 'drizzle-orm';

// ─── Audit Log Writer Utility (imported by other routes) ────
export async function createAuditLog(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    justification?: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    ipAddress?: string;
}) {
    try {
        await db.insert(auditLogs).values({
            userId: params.userId,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            fieldName: params.fieldName || null,
            oldValue: params.oldValue || null,
            newValue: params.newValue || null,
            justification: params.justification || null,
            changes: params.changes || null,
            ipAddress: params.ipAddress || null,
        });
    } catch (err) {
        console.error('Failed to create audit log:', err);
    }
}

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const auditRoutes: RouteEntry[] = [
    ['GET', '/api/audit', async (req) => {
        const url = new URL(req.url);
        const page = Number(url.searchParams.get('page')) || 1;
        const limit = Number(url.searchParams.get('limit')) || 50;

        const logs = await db.select({
            id: auditLogs.id,
            action: auditLogs.action,
            entityType: auditLogs.entityType,
            entityId: auditLogs.entityId,
            changes: auditLogs.changes,
            ipAddress: auditLogs.ipAddress,
            createdAt: auditLogs.createdAt,
            userName: users.name,
            userRole: users.role,
        }).from(auditLogs)
            .leftJoin(users, eq(auditLogs.userId, users.id))
            .orderBy(desc(auditLogs.createdAt))
            .limit(limit)
            .offset((page - 1) * limit);

        return Response.json({ success: true, data: logs });
    }],
];
