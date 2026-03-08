// ============================================================
// Império Lord Master CRM — Configuration
// ============================================================

export const config = {
    database: {
        url: process.env.DATABASE_URL || 'postgresql://imperio:imperio_secret@localhost:5432/imperio_lord',
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'dev-secret-change-me',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    server: {
        apiPort: Number(process.env.API_PORT) || 3000,
        webPort: Number(process.env.WEB_PORT) || 5173,
        wsPort: Number(process.env.WS_PORT) || 3001,
    },
    minio: {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: Number(process.env.MINIO_PORT) || 9000,
        accessKey: process.env.MINIO_ACCESS_KEY || 'imperio_minio',
        secretKey: process.env.MINIO_SECRET_KEY || 'imperio_minio_secret',
        bucket: process.env.MINIO_BUCKET || 'imperio-files',
    },
    bot: {
        bridgeUrl: process.env.BOT_BRIDGE_URL || 'http://localhost:3002',
        wsUrl: process.env.BOT_WS_URL || 'ws://localhost:3002/ws',
    },
    ollama: {
        url: process.env.OLLAMA_URL || 'http://localhost:11434',
    },
    qdrant: {
        url: process.env.QDRANT_URL || 'http://localhost:6333',
    },

    // Business constants
    traction: {
        weights: {
            newLeads: 0.20,
            funnelConversion: 0.25,
            responseTime: 0.15,
            missionExecution: 0.20,
            revenueGrowth: 0.20,
        },
        bands: {
            accelerating: { min: 75, max: 100 },
            stable: { min: 50, max: 74 },
            stagnant: { min: 25, max: 49 },
            collapsing: { min: 0, max: 24 },
        },
    },

    alerts: {
        bottleneckThresholdHours: 72,
        churnRiskDays: 30,
        responseTimeTargetMinutes: 10,
        npsIntervalDays: 90,
        paymentWarningDays: 7,
        paymentOverdueDays: [1, 7, 15, 30],
    },

    sla: {
        defaultFirstResponseHours: 4,
        defaultResolutionHours: 24,
    },
} as const;

export type Config = typeof config;
export default config;
