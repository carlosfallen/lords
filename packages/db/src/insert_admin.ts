import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from './schema';

const client = postgres(process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/lords_crm', { max: 1 });
const db = drizzle(client, { schema: s });

async function insertAdmin() {
    try {
        const passwordHash = await Bun.password.hash('imperio123', { algorithm: 'argon2id' });
        const [adminUser] = await db.insert(s.users).values({
            email: 'admin@imperiolord.com',
            passwordHash,
            name: 'Lord Admin',
            role: 'super_admin',
            phone: '(11) 99999-0001',
        }).returning();
        console.log('✅ Admin user successfully inserted:', adminUser.email);
    } catch (e) {
        console.error('❌ Error inserting admin user:', e);
    } finally {
        await client.end();
        process.exit(0);
    }
}
insertAdmin();
