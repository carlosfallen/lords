// ============================================================
// Lords CRM — Cloudflare Worker Entry Point (Hono)
// ============================================================
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { authMiddleware } from './middleware/auth';

// Route modules
import auth from './routes/auth';
import audit from './routes/audit';
import leads from './routes/leads';
import clients from './routes/clients';
import dashboard from './routes/dashboard';
import pipeline from './routes/pipeline';
import users from './routes/users';
import whatsapp from './routes/whatsapp';
import crud from './routes/crud';

const app = new Hono<{ Bindings: Env }>();

// ─── Error Handling ─────────────────────────────────────────
app.onError((err, c) => {
    if (err instanceof SyntaxError && err.message.includes('JSON')) {
        return c.json({ success: false, error: 'Invalid or empty JSON body' }, 400);
    }
    console.error('[Hono Error]', err);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

// ─── CORS ───────────────────────────────────────────────────
app.use('*', async (c, next) => {
    const origins = (c.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
    const corsMiddleware = cors({
        origin: origins.length === 1 && origins[0] === '*' ? '*' : origins,
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    });
    return corsMiddleware(c, next);
});

// ─── Auth Middleware (skips public paths) ────────────────────
app.use('/api/*', authMiddleware);

// ─── Mount Routes ───────────────────────────────────────────
app.route('/', auth);
app.route('/', audit);
app.route('/', leads);
app.route('/', clients);
app.route('/', dashboard);
app.route('/', pipeline);
app.route('/', users);
app.route('/', whatsapp);
app.route('/', crud);

// ─── 404 Fallback ───────────────────────────────────────────
app.all('*', (c) => c.json({ success: false, error: 'Not Found' }, 404));

export default app;
