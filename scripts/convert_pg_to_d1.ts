// ============================================================
// Convert d1_migration.sql (PostgreSQL dump) → D1-compatible SQL
// - Extracts INSERT data (skips DDL)
// - Maps positional VALUES to explicit column names (PG order → D1)
// - Replaces argon2id hashes with PBKDF2 hash of "Trocar@123"
// - Uses INSERT OR IGNORE to safely re-run
// Run: bun run scripts/convert_pg_to_d1.ts
// ============================================================

import { readFileSync, writeFileSync } from 'fs';
import { createHash, pbkdf2Sync, randomBytes } from 'crypto';

const INPUT = './d1_migration.sql';
const OUTPUT = './apps/cf-api/migrations/data_migration.sql';
const TEMP_PASSWORD = 'Trocar@123';

// ── PBKDF2 hash compatible with our Worker auth ──────────────
async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `pbkdf2:sha512:100000:${salt}:${hash}`;
}

// ── Column order for each table in the PostgreSQL dump ───────
// (derived from the CREATE TABLE definitions in d1_migration.sql)
const PG_COLUMNS: Record<string, string[]> = {
    users: ['id', 'email', 'password_hash', 'name', 'role', 'avatar_url', 'phone', 'is_active',
        'tenant_id', 'last_login_at', 'created_at', 'updated_at', 'must_change_password'],
    tenants: ['id', 'name', 'trade_name', 'niche', 'document', 'email', 'phone', 'city',
        'state', 'address', 'logo_url', 'tags', 'segment', 'mentor_id', 'is_active', 'notes',
        'metadata', 'created_at', 'updated_at'],
    leads: ['id', 'tenant_id', 'name', 'phone', 'email', 'niche', 'problem_description',
        'product_of_interest', 'temperature', 'source', 'utm_source', 'utm_medium', 'utm_campaign',
        'current_funnel_stage_id', 'assigned_to_id', 'estimated_value', 'loss_reason', 'is_converted',
        'converted_at', 'last_contact_at', 'next_follow_up_at', 'metadata', 'created_at', 'updated_at',
        'diagnostic_sold', 'diagnostic_paid', 'diagnostic_scheduled_at', 'diagnostic_completed_at',
        'representative_id', 'status', 'cidade', 'observacao_inicial', 'motivo_perda_texto',
        'snooze_until', 'snooze_motivo'],
    audit_logs: ['id', 'user_id', 'action', 'entity_type', 'entity_id', 'changes', 'ip_address',
        'user_agent', 'created_at', 'field_name', 'old_value', 'new_value', 'justification'],
    bot_health_events: ['id', 'session_id', 'event_type', 'reason', 'duration_seconds', 'created_at'],
    bot_sessions: ['id', 'instance_name', 'status', 'phone_number', 'connected_at',
        'disconnected_at', 'uptime_seconds', 'metadata', 'created_at', 'updated_at'],
    bottleneck_alerts: ['id', 'tenant_id', 'funnel_stage_id', 'severity', 'leads_stuck',
        'estimated_revenue_lost', 'hours_stuck', 'message', 'is_acknowledged',
        'acknowledged_by_user_id', 'created_at'],
    city_presentations: ['id', 'cidade', 'link', 'ativo', 'updated_at', 'updated_by_admin_id', 'created_at'],
    client_contracts: ['id', 'tenant_id', 'plan_name', 'monthly_value', 'status', 'start_date',
        'end_date', 'renewal_date', 'payment_day', 'notes', 'created_at', 'updated_at'],
    client_products: ['id', 'tenant_id', 'system_type', 'name', 'version', 'access_url',
        'status', 'delivered_at', 'config', 'created_at', 'updated_at'],
    client_team_members: ['id', 'tenant_id', 'name', 'role', 'phone', 'email',
        'total_attendances', 'conversion_rate', 'avg_response_time_min', 'is_active',
        'created_at', 'updated_at'],
    commissions: ['id', 'user_id', 'deal_id', 'tenant_id', 'amount', 'percentage', 'description',
        'is_paid', 'paid_at', 'period_start', 'period_end', 'created_at', 'project_id',
        'representative_id', 'commission_total', 'first_payment_amount', 'third_installment_amount',
        'first_payment_status', 'third_payment_status', 'first_payment_date', 'third_payment_date'],
    deals_pipeline: ['id', 'lead_id', 'title', 'contact_name', 'contact_phone', 'contact_email',
        'product_of_interest', 'proposed_value', 'status', 'stage', 'temperature', 'assigned_to_id',
        'next_step', 'next_step_date', 'won_at', 'lost_at', 'loss_reason', 'interaction_history',
        'created_at', 'updated_at'],
    delete_requests: ['id', 'lead_id', 'representante_id', 'motivo', 'status', 'decided_at',
        'decided_by_admin_id', 'admin_motivo', 'created_at'],
    documents: ['id', 'tenant_id', 'name', 'category', 'mime_type', 'file_url', 'file_size',
        'version', 'previous_version_id', 'uploaded_by_user_id', 'created_at'],
    funnel_events: ['id', 'lead_id', 'from_stage_id', 'to_stage_id', 'moved_by_user_id', 'created_at'],
    funnel_stages: ['id', 'tenant_id', 'name', 'slug', 'order', 'color', 'is_default', 'created_at'],
    ideas: ['id', 'title', 'description', 'status', 'upvotes', 'downvotes',
        'submitted_by_user_id', 'linked_client_requests', 'created_at', 'updated_at'],
    internal_campaigns: ['id', 'name', 'source', 'budget', 'spent', 'leads_generated',
        'conversions', 'cpl', 'roi', 'is_active', 'start_date', 'end_date', 'creatives',
        'created_at', 'updated_at'],
    lead_activities: ['id', 'lead_id', 'user_id', 'canal', 'resultado', 'observacao',
        'contacted_at', 'created_at'],
    lead_conversations: ['id', 'lead_id', 'direction', 'sender_type', 'message_type', 'content',
        'media_url', 'intent', 'is_read', 'created_at', 'wa_message_id'],
    lead_flow_events: ['id', 'lead_id', 'trail', 'from_stage', 'to_stage', 'intent',
        'metadata', 'created_at'],
    lead_notes: ['id', 'lead_id', 'user_id', 'texto', 'created_at'],
    lead_proposals: ['id', 'lead_id', 'created_by_admin_id', 'tipo', 'arquivo_pdf_url', 'url',
        'status_proposta', 'observacao_admin', 'created_at', 'updated_at'],
    mentorship_sessions: ['id', 'tenant_id', 'mentor_id', 'scheduled_at', 'duration_minutes',
        'pre_briefing', 'notes', 'decisions', 'next_steps', 'traction_score_before',
        'traction_score_after', 'completed_at', 'created_at'],
    mentorship_tasks: ['id', 'tenant_id', 'title', 'description', 'priority', 'status',
        'assigned_to_client_user_id', 'created_by_user_id', 'playbook_id', 'due_date',
        'completed_at', 'checklist', 'attachments', 'blocks_access', 'created_at', 'updated_at'],
    money_on_table_snapshots: ['id', 'tenant_id', 'total_lost', 'unanswered_leads_loss',
        'no_show_loss', 'stuck_leads_loss', 'stuck_inventory_loss', 'low_conversion_loss',
        'period_start', 'period_end', 'calculated_at'],
    nps_responses: ['id', 'tenant_id', 'score', 'comment', 'trigger_type', 'created_at'],
    onboarding_processes: ['id', 'tenant_id', 'status', 'checklist', 'assigned_to_id',
        'started_at', 'completed_at', 'created_at', 'updated_at'],
    operational_costs: ['id', 'category', 'description', 'amount', 'is_recurring',
        'period_month', 'period_year', 'created_at'],
    payments: ['id', 'tenant_id', 'contract_id', 'amount', 'due_date', 'paid_at', 'is_paid',
        'method', 'reference', 'notes', 'created_at'],
    playbooks: ['id', 'title', 'slug', 'description', 'category', 'niche', 'content', 'steps',
        'is_active', 'created_at', 'updated_at'],
    projects: ['id', 'lead_id', 'total_value', 'entry_value', 'installments_count',
        'installment_value', 'status', 'representative_id', 'created_at', 'updated_at'],
    proposal_adjustment_requests: ['id', 'lead_id', 'representante_id', 'mensagem', 'status',
        'admin_response', 'responded_at', 'responded_by_admin_id', 'created_at'],
    prospect_campaigns: ['id', 'tenant_id', 'name', 'channel_type', 'status',
        'playbook_base_prompt', 'playbook_stages', 'send_rate_per_hour', 'is_active',
        'created_at', 'updated_at'],
    prospect_contacts: ['id', 'tenant_id', 'name', 'phone', 'email', 'company', 'opt_in',
        'opt_in_at', 'opt_in_ip', 'tags', 'custom_variables', 'status', 'created_at', 'updated_at'],
    prospect_logs: ['id', 'tenant_id', 'campaign_id', 'contact_id', 'event', 'payload', 'created_at'],
    prospect_queues: ['id', 'tenant_id', 'campaign_id', 'contact_id', 'channel_type', 'status',
        'priority', 'attempts', 'max_attempts', 'last_error', 'scheduled_at', 'created_at'],
    refresh_tokens: ['id', 'user_id', 'token', 'expires_at', 'created_at'],
    representatives: ['id', 'user_id', 'display_name', 'commission_percent', 'code', 'notes',
        'is_active', 'created_at', 'updated_at'],
    support_tickets: ['id', 'tenant_id', 'title', 'description', 'priority', 'status',
        'assigned_to_id', 'created_by_user_id', 'system_type', 'sla_first_response_hours',
        'sla_resolution_hours', 'first_response_at', 'resolved_at', 'closed_at', 'csat_score',
        'messages', 'created_at', 'updated_at'],
    system_templates: ['id', 'name', 'system_type', 'description', 'version', 'price',
        'is_active', 'features', 'provisioning_script', 'created_at', 'updated_at'],
    team_members: ['id', 'user_id', 'position', 'department', 'clients_managed',
        'missions_sent', 'sessions_completed', 'avg_client_traction_score', 'monthly_goals',
        'created_at', 'updated_at'],
    traction_scores: ['id', 'tenant_id', 'score', 'new_leads_score', 'funnel_conversion_score',
        'response_time_score', 'mission_execution_score', 'revenue_growth_score', 'calculated_at'],
    wiki_articles: ['id', 'title', 'slug', 'category', 'content', 'tags', 'author_id',
        'is_published', 'created_at', 'updated_at'],
};

// ── Parse VALUES string into array of values ─────────────────
function parseValues(valStr: string): string[] {
    const values: string[] = [];
    let depth = 0;
    let inStr = false;
    let escape = false;
    let current = '';

    for (let i = 0; i < valStr.length; i++) {
        const ch = valStr[i];
        if (escape) { current += ch; escape = false; continue; }
        if (ch === '\\') { current += ch; escape = true; continue; }
        if (ch === "'" && !inStr) { inStr = true; current += ch; continue; }
        if (ch === "'" && inStr) {
            // Check for escaped quote ''
            if (valStr[i + 1] === "'") { current += "''"; i++; continue; }
            inStr = false; current += ch; continue;
        }
        if (inStr) { current += ch; continue; }
        if (ch === '(' && !inStr) { depth++; current += ch; continue; }
        if (ch === ')' && !inStr) {
            depth--;
            if (depth < 0) break;
            current += ch; continue;
        }
        if (ch === ',' && depth === 0) {
            values.push(current.trim());
            current = '';
            continue;
        }
        current += ch;
    }
    if (current.trim()) values.push(current.trim());
    return values;
}

async function main() {
    console.log('Reading input file...');
    const content = readFileSync(INPUT, 'utf-8');
    const lines = content.split('\n');

    // Find data section start
    const dataStart = lines.findIndex(l => l.includes('-- DATA --') || l.includes('-- ============================================================') && lines[lines.indexOf(l) + 1]?.includes('-- DATA'));
    const startIdx = lines.findIndex(l => l.trim() === '-- ============================================================' && lines[lines.indexOf(l) + 2]?.includes('DATA'));

    console.log(`Data section found around line ${startIdx}`);

    // Pre-compute PBKDF2 hash for temp password
    const tempHash = await hashPassword(TEMP_PASSWORD);
    console.log(`Generated PBKDF2 hash for "${TEMP_PASSWORD}"`);

    const output: string[] = [
        '-- ============================================================',
        '-- Lords CRM — D1 Data Migration (converted from PostgreSQL dump)',
        `-- Temporary password for all users: ${TEMP_PASSWORD}`,
        '-- Users must change password on first login.',
        '-- ============================================================',
        '',
        'PRAGMA foreign_keys = OFF;',
        '',
    ];

    let converted = 0;
    let skipped = 0;
    let errors = 0;

    let buffer = '';

    // Simple state machine to process statements
    for (let i = Math.max(startIdx, 0); i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('INSERT INTO ')) {
            // If we have an existing buffer, it means the previous statement never finished
            if (buffer) {
                console.warn(`⚠️  Incomplete INSERT abandoned at line ${i}: ${buffer.substring(0, 100)}...`);
                errors++;
                buffer = '';
            }
            buffer = line;
        } else if (buffer) {
            buffer += '\n' + line;
        }

        if (buffer && buffer.trim().endsWith(';')) {
            const statement = buffer.trim();
            buffer = '';

            // Extract table name and values
            const match = statement.match(/INSERT INTO (\w+) VALUES\s*\(([\s\S]*)\);/i);
            if (!match) {
                console.warn(`⚠️  Failed to match pattern in statement: ${statement.substring(0, 100)}...`);
                errors++;
                continue;
            }

            const tableName = match[1];
            const valuesBlock = match[2];

            if (tableName.includes('drizzle')) { skipped++; continue; }

            const pgCols = PG_COLUMNS[tableName];
            if (!pgCols) {
                console.warn(`⚠️  Unknown table: ${tableName} — skipping`);
                skipped++;
                continue;
            }

            const values = parseValues(valuesBlock);

            if (values.length !== pgCols.length) {
                console.warn(`⚠️  Column count mismatch for ${tableName} at line ${i}: expected ${pgCols.length}, got ${values.length}`);
                // Attempting to see if it's just missing trailing columns that can be NULL
                if (values.length < pgCols.length) {
                    while (values.length < pgCols.length) values.push('NULL');
                } else {
                    errors++;
                    continue;
                }
            }

            // Replace argon2id password hashes in users table
            let processedValues = [...values];
            if (tableName === 'users') {
                const pwIdx = pgCols.indexOf('password_hash');
                if (pwIdx >= 0 && (processedValues[pwIdx]?.includes('argon2id') || processedValues[pwIdx]?.includes('$argon2'))) {
                    processedValues[pwIdx] = `'${tempHash}'`;
                }
                const mcpIdx = pgCols.indexOf('must_change_password');
                if (mcpIdx >= 0) processedValues[mcpIdx] = '1';
            }

            const colList = pgCols.map(c => {
                const reserved = ['order', 'group', 'user', 'primary', 'index'];
                return reserved.includes(c.toLowerCase()) ? `"${c}"` : c;
            }).join(', ');

            const valList = processedValues.join(', ');
            output.push(`INSERT OR IGNORE INTO ${tableName} (${colList}) VALUES (${valList});`);
            converted++;
        }
    }

    output.push('', 'PRAGMA foreign_keys = ON;', '');
    output.push(`-- Converted: ${converted} rows, Skipped: ${skipped}, Errors/Incomplete: ${errors}`);

    writeFileSync(OUTPUT, output.join('\n'), 'utf-8');
    console.log(`✅ Done! Converted ${converted} rows. Errors: ${errors}. Output: ${OUTPUT}`);
}

main().catch(console.error);
