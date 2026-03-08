import type { Config } from 'drizzle-kit';

export default {
    schema: './src/schema.ts',
    out: './migrations',
    dialect: 'sqlite',
    driver: 'd1-http', // Under the hood for Cloudflare, or just simple d1
} satisfies Config;
