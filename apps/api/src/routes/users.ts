// ============================================================
// Users Routes — Real Database Queries for User Management
// ============================================================
import { db, users, representatives, auditLogs } from 'db';
import { eq, desc } from 'drizzle-orm';
import { requireMinRole, requireInternal } from '../middleware/auth';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const userRoutes: RouteEntry[] = [
    ['GET', '/api/users', async (req) => {
        const currentUser = (req as any)._user;
        // Only managers or admins should list all users in this manner
        if (!['super_admin', 'admin', 'gestor'].includes(currentUser?.role)) {
            return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const allUsers = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            role: users.role,
            isActive: users.isActive,
            lastLoginAt: users.lastLoginAt,
            createdAt: users.createdAt,
            commissionPercent: representatives.commissionPercent,
            representativeId: representatives.id,
        }).from(users)
            .leftJoin(representatives, eq(users.id, representatives.userId))
            .orderBy(desc(users.createdAt));

        return Response.json({ success: true, data: allUsers });
    }],

    ['POST', '/api/users', async (req) => {
        const body = await req.json();
        const currentUser = (req as any)._user;

        if (!['super_admin', 'admin', 'gestor'].includes(currentUser?.role)) {
            return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const passwordHash = await Bun.password.hash(body.password || 'senha123', { algorithm: 'argon2id' });

        const [newUser] = await db.insert(users).values({
            name: body.name,
            email: body.email,
            phone: body.phone,
            role: body.role,
            passwordHash,
            mustChangePassword: true,
            tenantId: currentUser.tenantId, // if applies
        }).returning();

        if (body.role === 'representante') {
            await db.insert(representatives).values({
                userId: newUser.id,
                displayName: body.name,
                commissionPercent: String(body.commissionPercent || 15.0),
                isActive: true,
            });
        }

        await db.insert(auditLogs).values({
            userId: currentUser.sub,
            action: 'USER_CREATED',
            entityType: 'user',
            entityId: newUser.id,
            changes: { email: { old: undefined, new: newUser.email }, role: { old: undefined, new: newUser.role } }
        } as any);

        return Response.json({ success: true, data: newUser }, { status: 201 });
    }],

    ['PUT', '/api/users/:id/status', async (req, params) => {
        const body = await req.json();
        const currentUser = (req as any)._user;

        if (!['super_admin', 'admin', 'gestor'].includes(currentUser?.role)) {
            return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const [updatedUser] = await db.update(users)
            .set({ isActive: body.isActive, updatedAt: new Date() })
            .where(eq(users.id, params.id))
            .returning();

        // also block rep if they are one
        if (updatedUser?.role === 'representante') {
            await db.update(representatives).set({ isActive: body.isActive, updatedAt: new Date() }).where(eq(representatives.userId, params.id));
        }

        await db.insert(auditLogs).values({
            userId: currentUser.sub,
            action: body.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
            entityType: 'user',
            entityId: params.id,
            changes: { status: { old: !body.isActive, new: body.isActive } }
        } as any);

        return Response.json({ success: true, data: updatedUser });
    }],
    ['PUT', '/api/users/:id/reset-password', async (req, params) => {
        const currentUser = (req as any)._user;

        if (!['super_admin', 'admin', 'gestor'].includes(currentUser?.role)) {
            return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const passwordHash = await Bun.password.hash('senha123', { algorithm: 'argon2id' });

        await db.update(users)
            .set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
            .where(eq(users.id, params.id));

        await db.insert(auditLogs).values({
            userId: currentUser.sub,
            action: 'USER_PASSWORD_RESET',
            entityType: 'user',
            entityId: params.id,
            changes: {}
        } as any);

        return Response.json({ success: true, message: 'Password reset to senha123' });
    }],

    ['PUT', '/api/users/:id', async (req, params) => {
        const body = await req.json();
        const currentUser = (req as any)._user;

        if (!['super_admin', 'admin', 'gestor'].includes(currentUser?.role)) {
            return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const [updatedUser] = await db.update(users)
            .set({
                name: body.name,
                email: body.email,
                phone: body.phone,
                role: body.role,
                updatedAt: new Date()
            })
            .where(eq(users.id, params.id))
            .returning();

        // Handle representative commission percent update if applies
        if (body.role === 'representante' && body.commissionPercent) {
            // Check if representative record exists
            const [rep] = await db.select().from(representatives).where(eq(representatives.userId, params.id));
            if (rep) {
                await db.update(representatives)
                    .set({ commissionPercent: String(body.commissionPercent), updatedAt: new Date() })
                    .where(eq(representatives.userId, params.id));
            } else {
                await db.insert(representatives).values({
                    userId: params.id,
                    displayName: body.name || updatedUser.name,
                    commissionPercent: String(body.commissionPercent),
                    isActive: updatedUser.isActive,
                });
            }
        }

        await db.insert(auditLogs).values({
            userId: currentUser.sub,
            action: 'USER_UPDATED',
            entityType: 'user',
            entityId: params.id,
            changes: { email: { new: updatedUser.email }, role: { new: updatedUser.role } }
        } as any);

        return Response.json({ success: true, data: updatedUser });
    }],
];
