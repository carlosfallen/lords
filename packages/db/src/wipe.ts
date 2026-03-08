import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as s from './schema';
import { sql } from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/lords_crm';
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema: s });

async function wipe() {
    console.log('🧹 Wiping fictitious data from Império Lord database...\n');

    const tables = [
        'audit_logs',
        'bot_sessions',
        'documents',
        'onboarding_processes',
        'system_templates',
        'ideas',
        'wiki_articles',
        'internal_campaigns',
        'payments',
        'team_members',
        'mentorship_sessions',
        'playbooks',
        'mentorship_tasks',
        'support_tickets',
        'deals_pipeline',
        'lead_conversations',
        'lead_flow_events',
        'leads',
        'money_on_table_snapshots',
        'traction_scores',
        'client_products',
        'client_contracts',
        'tenants',
        'prospect_logs',
        'prospect_queues',
        'prospect_contacts',
        'prospect_campaigns',
        'projects',
        'representatives',
        'nps_responses',
        'funnel_events',
        'funnel_stages',
        'commissions',
        'client_team_members',
        'bottleneck_alerts',
        'operational_costs',
        'refresh_tokens'
    ];

    try {
        // 1. Truncate all tables except users
        console.log('🗑️  Truncating transactional tables...');
        for (const table of tables) {
            await db.execute(sql.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`));
        }

        // 2. Clean users (Keep only the primary admin)
        console.log('👤  Cleaning user accounts...');
        // We'll keep the admin@imperiolord.com and delete the rest
        await db.execute(sql.raw(`DELETE FROM "users" WHERE email != 'admin@imperiolord.com'`));

        console.log('\n✨ Database is now clean and ready for real data!');
        console.log('ℹ️  Preserved: super_admin (admin@imperiolord.com)');

    } catch (err) {
        console.error('❌ Wipe failed:', err);
    } finally {
        await client.end();
        process.exit(0);
    }
}

wipe();
