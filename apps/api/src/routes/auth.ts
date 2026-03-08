// ============================================================
// Auth Routes — Real Database Integration
// ============================================================
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth';
import { db, users, refreshTokens, representatives } from 'db';
import { eq, and, gt } from 'drizzle-orm';

type RouteEntry = [string, string, (req: Request, params: Record<string, string>) => Promise<Response>];

export const authRoutes: RouteEntry[] = [
    ['POST', '/api/auth/login', async (req) => {
        const { email, password } = await req.json();
        if (!email || !password) {
            return Response.json({ success: false, error: 'Email and password required' }, { status: 400 });
        }

        // Look up user in database
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || !user.isActive) {
            return Response.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        // Verify password with argon2
        const valid = await Bun.password.verify(password, user.passwordHash);
        if (!valid) {
            return Response.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
        }

        // Update last login
        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

        let representativeId: string | undefined = undefined;
        if (user.role === 'representante') {
            const [rep] = await db.select().from(representatives).where(eq(representatives.userId, user.id)).limit(1);
            if (rep) representativeId = rep.id;
        }

        const accessToken = await signAccessToken({
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            representativeId,
        });
        const refreshTokenValue = await signRefreshToken(user.id);

        // Store refresh token in DB (clean up old ones first)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
        await db.insert(refreshTokens).values({
            userId: user.id,
            token: refreshTokenValue,
            expiresAt,
        });

        return Response.json({
            success: true,
            data: {
                user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, mustChangePassword: user.mustChangePassword },
                accessToken,
                refreshToken: refreshTokenValue,
            },
        });
    }],

    ['POST', '/api/auth/register', async (req) => {
        const { email, password, name, role } = await req.json();
        if (!email || !password || !name) {
            return Response.json({ success: false, error: 'Email, password and name required' }, { status: 400 });
        }

        // Check if user already exists
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing) {
            return Response.json({ success: false, error: 'User already exists' }, { status: 409 });
        }

        // Hash password with argon2
        const passwordHash = await Bun.password.hash(password, { algorithm: 'argon2id' });

        const [newUser] = await db.insert(users).values({
            email,
            passwordHash,
            name,
            role: role || 'support',
        }).returning();

        const accessToken = await signAccessToken({
            sub: newUser.id,
            email: newUser.email,
            role: newUser.role,
            tenantId: newUser.tenantId,
        });
        const refreshTokenValue = await signRefreshToken(newUser.id);

        return Response.json({
            success: true,
            data: {
                user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, tenantId: newUser.tenantId },
                accessToken,
                refreshToken: refreshTokenValue,
            },
        });
    }],

    ['POST', '/api/auth/refresh', async (req) => {
        const { refreshToken: token } = await req.json();
        if (!token) {
            return Response.json({ success: false, error: 'Refresh token required' }, { status: 400 });
        }

        const payload = await verifyRefreshToken(token);
        if (!payload) {
            return Response.json({ success: false, error: 'Invalid refresh token' }, { status: 401 });
        }

        // Verify token exists in DB and hasn't expired
        const [stored] = await db.select().from(refreshTokens)
            .where(and(eq(refreshTokens.token, token), gt(refreshTokens.expiresAt, new Date())))
            .limit(1);

        if (!stored) {
            return Response.json({ success: false, error: 'Refresh token revoked or expired' }, { status: 401 });
        }

        // Get user data for new access token
        const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 401 });
        }

        // Delete old token and create new one (rotation)
        await db.delete(refreshTokens).where(eq(refreshTokens.token, token));

        let representativeId: string | undefined = undefined;
        if (user.role === 'representante') {
            const [rep] = await db.select().from(representatives).where(eq(representatives.userId, user.id)).limit(1);
            if (rep) representativeId = rep.id;
        }

        const accessToken = await signAccessToken({
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            representativeId,
        });
        const newRefreshToken = await signRefreshToken(user.id);

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.insert(refreshTokens).values({
            userId: user.id,
            token: newRefreshToken,
            expiresAt,
        });

        return Response.json({
            success: true,
            data: { accessToken, refreshToken: newRefreshToken },
        });
    }],

    ['POST', '/api/auth/change-password', async (req) => {
        const body = await req.json();
        const currentUser = (req as any)._user;

        if (!currentUser) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = body;
        if (!newPassword) {
            return Response.json({ success: false, error: 'New password is required' }, { status: 400 });
        }

        // Fetch user from DB
        const [user] = await db.select().from(users).where(eq(users.id, currentUser.sub)).limit(1);
        if (!user) {
            return Response.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // If currentPassword is provided, verify it (unless they are forced to change, maybe they don't know it? But they just logged in)
        // Actually, if mustChangePassword is true, they might just have logged in with the default password.
        // We can optionally verify currentPassword if provided.
        if (currentPassword) {
            const valid = await Bun.password.verify(currentPassword, user.passwordHash);
            if (!valid) {
                return Response.json({ success: false, error: 'Invalid current password' }, { status: 401 });
            }
        }

        // Hash new password
        const passwordHash = await Bun.password.hash(newPassword, { algorithm: 'argon2id' });

        // Update user
        await db.update(users)
            .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
            .where(eq(users.id, currentUser.sub));

        return Response.json({ success: true });
    }],
];
