// ============================================================
// Império Lord Master CRM — Complete Drizzle ORM Schema
// ============================================================
import {
    sqliteTable,
    text,
    integer,
    real,
    index,
    uniqueIndex,
    AnySQLiteColumn
} from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ─── ENUMS ──────────────────────────────────────────────────



























// ─── 1. USERS (Internal Team + Client Users) ───────────────
export const users = sqliteTable('users', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role', { enum: [
    'super_admin', 'admin', 'mentor', 'support', 'finance', 'client_owner', 'client_staff',
    'gestor', 'atendimento', 'representante', 'financeiro'
] }).notNull().default('support'),
    avatarUrl: text('avatar_url'),
    phone: text('phone'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
    tenantId: text('tenant_id').references((): AnySQLiteColumn => tenants.id),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('users_email_idx').on(t.email),
    index('users_role_idx').on(t.role),
    index('users_tenant_idx').on(t.tenantId),
]);

// ─── 2. TENANTS / CLIENTS ──────────────────────────────────
export const tenants = sqliteTable('tenants', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    name: text('name').notNull(),
    tradeName: text('trade_name'),
    niche: text('niche'),
    document: text('document'), // CNPJ
    email: text('email'),
    phone: text('phone'),
    city: text('city'),
    state: text('state'),
    address: text('address'),
    logoUrl: text('logo_url'),
    tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
    segment: text('segment'),
    mentorId: text('mentor_id').references((): AnySQLiteColumn => users.id),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    notes: text('notes'),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('tenants_niche_idx').on(t.niche),
    index('tenants_mentor_idx').on(t.mentorId),
    index('tenants_segment_idx').on(t.segment),
]);

// ─── 3. CLIENT CONTRACTS ───────────────────────────────────
export const clientContracts = sqliteTable('client_contracts', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    planName: text('plan_name').notNull(),
    monthlyValue: real('monthly_value').notNull(),
    status: text('status', { enum: ['active', 'suspended', 'cancelled', 'expired'] }).notNull().default('active'),
    startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
    endDate: integer('end_date', { mode: 'timestamp' }),
    renewalDate: integer('renewal_date', { mode: 'timestamp' }),
    paymentDay: integer('payment_day').notNull().default(10),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('contracts_tenant_idx').on(t.tenantId),
    index('contracts_status_idx').on(t.status),
]);

// ─── 4. CLIENT PRODUCTS (systems contracted) ───────────────
export const clientProducts = sqliteTable('client_products', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    systemType: text('system_type', { enum: [
    'scheduling', 'orders_delivery', 'crm', 'inventory', 'pos', 'whatsapp_bot', 'landing_page', 'ads_management',
] }).notNull(),
    name: text('name').notNull(),
    version: text('version'),
    accessUrl: text('access_url'),
    status: text('status', { enum: [
    'configuring', 'awaiting_data', 'training', 'delivered', 'active',
] }).notNull().default('configuring'),
    deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
    config: text('config', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('products_tenant_idx').on(t.tenantId),
]);

// ─── 5. CLIENT TEAM MEMBERS ────────────────────────────────
export const clientTeamMembers = sqliteTable('client_team_members', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    name: text('name').notNull(),
    role: text('role'),
    phone: text('phone'),
    email: text('email'),
    totalAttendances: integer('total_attendances').notNull().default(0),
    conversionRate: real('conversion_rate').default('0'),
    avgResponseTimeMin: real('avg_response_time_min'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('client_team_tenant_idx').on(t.tenantId),
]);

// ─── 6. LEADS ──────────────────────────────────────────────
export const leads = sqliteTable('leads', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').references(() => tenants.id),
    name: text('name'),
    phone: text('phone').notNull(),
    email: text('email'),
    niche: text('niche'),
    problemDescription: text('problem_description'),
    productOfInterest: text('product_of_interest'),
    temperature: text('temperature', { enum: ['cold', 'warm', 'hot', 'cooled'] }).notNull().default('cold'),
    source: text('source', { enum: [
    'meta_ads', 'google_ads', 'organic_instagram', 'referral', 'whatsapp_direct', 'other',
] }).default('whatsapp_direct'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    currentFunnelStageId: text('current_funnel_stage_id'),
    assignedToId: text('assigned_to_id').references(() => users.id),
    estimatedValue: real('estimated_value'),
    lossReason: text('loss_reason', { enum: [
    'price', 'competition', 'no_interest', 'no_response', 'timing', 'other',
] }),
    isConverted: integer('is_converted', { mode: 'boolean' }).notNull().default(false),
    convertedAt: integer('converted_at', { mode: 'timestamp' }),
    lastContactAt: integer('last_contact_at', { mode: 'timestamp' }),
    diagnosticSold: integer('diagnostic_sold', { mode: 'boolean' }).notNull().default(false),
    diagnosticPaid: integer('diagnostic_paid', { mode: 'boolean' }).notNull().default(false),
    diagnosticScheduledAt: integer('diagnostic_scheduled_at', { mode: 'timestamp' }),
    diagnosticCompletedAt: integer('diagnostic_completed_at', { mode: 'timestamp' }),
    representativeId: text('representative_id'), // added later
    cidade: text('cidade'),
    observacaoInicial: text('observacao_inicial'),
    motivoPerdaTexto: text('motivo_perda_texto'), // free-text loss reason
    snoozeUntil: integer('snooze_until', { mode: 'timestamp' }),
    snoozeMotivo: text('snooze_motivo'),
    status: text('status').notNull().default('ativo'),
    nextFollowUpAt: integer('next_follow_up_at', { mode: 'timestamp' }),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('leads_phone_idx').on(t.phone),
    index('leads_tenant_idx').on(t.tenantId),
    index('leads_temperature_idx').on(t.temperature),
    index('leads_assigned_idx').on(t.assignedToId),
    index('leads_created_idx').on(t.createdAt),
    index('leads_updated_tenant_idx').on(t.tenantId, t.updatedAt),
    index('leads_not_converted_idx').on(t.isConverted).where(sql`${t.isConverted} IS FALSE`),
    uniqueIndex('leads_phone_tenant_unique_idx').on(t.phone, t.tenantId), // Enforce isolation at DB level
]);

// JWT_SECRET enforcement (moved outside sqliteTable definition for syntactic correctness)
if (!process.env.JWT_SECRET) {
    console.warn('⚠️ WARNING: JWT_SECRET not defined. Using insecure fallback "dev-secret".');
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me');

// ─── 7. LEAD CONVERSATIONS (WhatsApp Messages) ─────────────
export const leadConversations = sqliteTable('lead_conversations', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').notNull().references(() => leads.id),
    direction: text('direction').notNull(), // 'inbound' | 'outbound'
    senderType: text('sender_type').notNull(), // 'lead' | 'bot' | 'human'
    messageType: text('message_type').notNull().default('text'), // 'text' | 'image' | 'audio' | 'document'
    content: text('content'),
    mediaUrl: text('media_url'),
    intent: text('intent'),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    waMessageId: text('wa_message_id'), // WhatsApp message ID for deduplication
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('conversations_lead_idx').on(t.leadId),
    index('conversations_created_idx').on(t.createdAt),
    uniqueIndex('conversations_wa_msg_idx').on(t.waMessageId),
]);

// ─── 8. LEAD FLOW EVENTS ──────────────────────────────────
export const leadFlowEvents = sqliteTable('lead_flow_events', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').notNull().references(() => leads.id),
    trail: text('trail', { enum: ['sale', 'support', 'mentorship'] }).notNull(),
    fromStage: text('from_stage'),
    toStage: text('to_stage').notNull(),
    intent: text('intent'),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('flow_events_lead_idx').on(t.leadId),
]);

// ─── 9. FUNNEL STAGES ─────────────────────────────────────
export const funnelStages = sqliteTable('funnel_stages', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').references(() => tenants.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    order: integer('order').notNull(),
    color: text('color'),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('funnel_stages_tenant_idx').on(t.tenantId),
]);

// ─── 10. FUNNEL EVENTS ────────────────────────────────────
export const funnelEvents = sqliteTable('funnel_events', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').notNull().references(() => leads.id),
    fromStageId: text('from_stage_id').references(() => funnelStages.id),
    toStageId: text('to_stage_id').notNull().references(() => funnelStages.id),
    movedByUserId: text('moved_by_user_id').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('funnel_events_lead_idx').on(t.leadId),
    index('funnel_events_created_idx').on(t.createdAt),
]);

// ─── 11. BOTTLENECK ALERTS ────────────────────────────────
export const bottleneckAlerts = sqliteTable('bottleneck_alerts', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').references(() => tenants.id),
    funnelStageId: text('funnel_stage_id').references(() => funnelStages.id),
    severity: text('severity', { enum: ['critical', 'warning', 'info'] }).notNull(),
    leadsStuck: integer('leads_stuck').notNull(),
    estimatedRevenueLost: real('estimated_revenue_lost'),
    hoursStuck: real('hours_stuck'),
    message: text('message').notNull(),
    isAcknowledged: integer('is_acknowledged', { mode: 'boolean' }).notNull().default(false),
    acknowledgedByUserId: text('acknowledged_by_user_id').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('bottleneck_tenant_idx').on(t.tenantId),
    index('bottleneck_severity_idx').on(t.severity),
]);

// ─── 12. TRACTION SCORES ──────────────────────────────────
export const tractionScores = sqliteTable('traction_scores', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    score: integer('score').notNull(),
    newLeadsScore: real('new_leads_score'),
    funnelConversionScore: real('funnel_conversion_score'),
    responseTimeScore: real('response_time_score'),
    missionExecutionScore: real('mission_execution_score'),
    revenueGrowthScore: real('revenue_growth_score'),
    calculatedAt: integer('calculated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('traction_tenant_idx').on(t.tenantId),
    index('traction_calculated_idx').on(t.calculatedAt),
]);

// ─── 13. MONEY ON TABLE SNAPSHOTS ─────────────────────────
export const moneyOnTableSnapshots = sqliteTable('money_on_table_snapshots', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    totalLost: real('total_lost').notNull(),
    unansweredLeadsLoss: real('unanswered_leads_loss'),
    noShowLoss: real('no_show_loss'),
    stuckLeadsLoss: real('stuck_leads_loss'),
    stuckInventoryLoss: real('stuck_inventory_loss'),
    lowConversionLoss: real('low_conversion_loss'),
    periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
    periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
    calculatedAt: integer('calculated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('mot_tenant_idx').on(t.tenantId),
]);

// ─── 14. MENTORSHIP TASKS (Missions) ──────────────────────
export const mentorshipTasks = sqliteTable('mentorship_tasks', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    title: text('title').notNull(),
    description: text('description'),
    priority: text('priority', { enum: ['urgent', 'high', 'normal'] }).notNull().default('normal'),
    status: text('status', { enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'] }).notNull().default('pending'),
    assignedToClientUserId: text('assigned_to_client_user_id'),
    createdByUserId: text('created_by_user_id').notNull().references(() => users.id),
    playbookId: text('playbook_id').references(() => playbooks.id),
    dueDate: integer('due_date', { mode: 'timestamp' }),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    checklist: text('checklist', { mode: 'json' }).$type<{ item: string; done: boolean }[]>().default([]),
    attachments: text('attachments', { mode: 'json' }).$type<{ name: string; url: string }[]>().default([]),
    blocksAccess: integer('blocks_access', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('missions_tenant_idx').on(t.tenantId),
    index('missions_status_idx').on(t.status),
]);

// ─── 15. MENTORSHIP SESSIONS ──────────────────────────────
export const mentorshipSessions = sqliteTable('mentorship_sessions', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    mentorId: text('mentor_id').notNull().references(() => users.id),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(),
    duration: integer('duration_minutes'),
    preBriefing: text('pre_briefing', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    notes: text('notes'),
    decisions: text('decisions'),
    nextSteps: text('next_steps'),
    tractionScoreBefore: integer('traction_score_before'),
    tractionScoreAfter: integer('traction_score_after'),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('sessions_tenant_idx').on(t.tenantId),
    index('sessions_mentor_idx').on(t.mentorId),
]);

// ─── 16. PLAYBOOKS ────────────────────────────────────────
export const playbooks = sqliteTable('playbooks', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    category: text('category'),
    niche: text('niche'),
    content: text('content').notNull(),
    steps: text('steps', { mode: 'json' }).$type<{ order: number; title: string; description: string }[]>().default([]),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 17. INTERNAL CAMPAIGNS ───────────────────────────────
export const internalCampaigns = sqliteTable('internal_campaigns', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    name: text('name').notNull(),
    source: text('source', { enum: [
    'meta_ads', 'google_ads', 'organic_instagram', 'referral', 'whatsapp_direct', 'other',
] }).notNull(),
    budget: real('budget'),
    spent: real('spent').default('0'),
    leadsGenerated: integer('leads_generated').notNull().default(0),
    conversions: integer('conversions').notNull().default(0),
    cpl: real('cpl'),
    roi: real('roi'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    startDate: integer('start_date', { mode: 'timestamp' }),
    endDate: integer('end_date', { mode: 'timestamp' }),
    creatives: text('creatives', { mode: 'json' }).$type<{ name: string; url: string; type: string }[]>().default([]),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 18. DEALS PIPELINE (Internal Sales) ──────────────────
export const dealsPipeline = sqliteTable('deals_pipeline', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').references(() => leads.id),
    title: text('title').notNull(),
    contactName: text('contact_name').notNull(),
    contactPhone: text('contact_phone'),
    contactEmail: text('contact_email'),
    productOfInterest: text('product_of_interest'),
    proposedValue: real('proposed_value'),
    status: text('status', { enum: ['open', 'won', 'lost', 'stale'] }).notNull().default('open'),
    stage: text('stage').notNull().default('lead'),
    temperature: text('temperature', { enum: ['cold', 'warm', 'hot', 'cooled'] }).default('cold'),
    assignedToId: text('assigned_to_id').references(() => users.id),
    nextStep: text('next_step'),
    nextStepDate: integer('next_step_date', { mode: 'timestamp' }),
    wonAt: integer('won_at', { mode: 'timestamp' }),
    lostAt: integer('lost_at', { mode: 'timestamp' }),
    lossReason: text('loss_reason', { enum: [
    'price', 'competition', 'no_interest', 'no_response', 'timing', 'other',
] }),
    interactionHistory: text('interaction_history', { mode: 'json' }).$type<{ date: string; type: string; note: string }[]>().default([]),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('deals_status_idx').on(t.status),
    index('deals_assigned_idx').on(t.assignedToId),
    index('deals_stage_idx').on(t.stage),
]);

// ─── 19. BOT SESSIONS ─────────────────────────────────────
export const botSessions = sqliteTable('bot_sessions', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    instanceName: text('instance_name').notNull(),
    status: text('status', { enum: ['connected', 'reconnecting', 'disconnected'] }).notNull().default('disconnected'),
    phoneNumber: text('phone_number'),
    connectedAt: integer('connected_at', { mode: 'timestamp' }),
    disconnectedAt: integer('disconnected_at', { mode: 'timestamp' }),
    uptimeSeconds: integer('uptime_seconds'),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 20. BOT HEALTH EVENTS ───────────────────────────────
export const botHealthEvents = sqliteTable('bot_health_events', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    sessionId: text('session_id').references(() => botSessions.id),
    eventType: text('event_type').notNull(), // 'connected' | 'disconnected' | 'reconnecting' | 'error'
    reason: text('reason'),
    durationSeconds: integer('duration_seconds'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('bot_health_session_idx').on(t.sessionId),
    index('bot_health_created_idx').on(t.createdAt),
]);

// ─── 21. SUPPORT TICKETS ──────────────────────────────────
export const supportTickets = sqliteTable('support_tickets', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    title: text('title').notNull(),
    description: text('description').notNull(),
    priority: text('priority', { enum: ['low', 'medium', 'high', 'urgent'] }).notNull().default('medium'),
    status: text('status', { enum: ['open', 'in_progress', 'waiting_client', 'resolved', 'closed'] }).notNull().default('open'),
    assignedToId: text('assigned_to_id').references(() => users.id),
    createdByUserId: text('created_by_user_id').references(() => users.id),
    systemType: text('system_type', { enum: [
    'scheduling', 'orders_delivery', 'crm', 'inventory', 'pos', 'whatsapp_bot', 'landing_page', 'ads_management',
] }),
    slaFirstResponseHours: integer('sla_first_response_hours'),
    slaResolutionHours: integer('sla_resolution_hours'),
    firstResponseAt: integer('first_response_at', { mode: 'timestamp' }),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
    closedAt: integer('closed_at', { mode: 'timestamp' }),
    csatScore: integer('csat_score'),
    messages: text('messages', { mode: 'json' }).$type<{ userId: string; content: string; createdAt: string }[]>().default([]),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('tickets_tenant_idx').on(t.tenantId),
    index('tickets_status_idx').on(t.status),
    index('tickets_priority_idx').on(t.priority),
    index('tickets_assigned_idx').on(t.assignedToId),
]);

// ─── 22. DOCUMENTS ────────────────────────────────────────
export const documents = sqliteTable('documents', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').references(() => tenants.id),
    name: text('name').notNull(),
    category: text('category'),
    mimeType: text('mime_type'),
    fileUrl: text('file_url').notNull(),
    fileSize: integer('file_size'),
    version: integer('version').notNull().default(1),
    previousVersionId: text('previous_version_id'),
    uploadedByUserId: text('uploaded_by_user_id').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('documents_tenant_idx').on(t.tenantId),
    index('documents_category_idx').on(t.category),
]);

// ─── 23. NPS RESPONSES ────────────────────────────────────
export const npsResponses = sqliteTable('nps_responses', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    score: integer('score').notNull(),
    comment: text('comment'),
    trigger: text('trigger'), // 'onboarding' | 'quarterly'
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('nps_tenant_idx').on(t.tenantId),
]);

// ─── 24. TEAM MEMBERS (Internal) ──────────────────────────
export const teamMembers = sqliteTable('team_members', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    userId: text('user_id').notNull().references(() => users.id),
    position: text('position'),
    department: text('department'),
    clientsManaged: integer('clients_managed').notNull().default(0),
    missionsSent: integer('missions_sent').notNull().default(0),
    sessionsCompleted: integer('sessions_completed').notNull().default(0),
    avgClientTractionScore: real('avg_client_traction_score'),
    monthlyGoals: text('monthly_goals', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    uniqueIndex('team_members_user_idx').on(t.userId),
]);

// ─── 25. COMMISSIONS ──────────────────────────────────────
export const commissions = sqliteTable('commissions', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    userId: text('user_id').notNull().references(() => users.id),
    dealId: text('deal_id').references(() => dealsPipeline.id),
    tenantId: text('tenant_id').references(() => tenants.id),
    amount: real('amount').notNull(),
    percentage: real('percentage'),
    description: text('description'),
    isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
    paidAt: integer('paid_at', { mode: 'timestamp' }),
    periodStart: integer('period_start', { mode: 'timestamp' }),
    periodEnd: integer('period_end', { mode: 'timestamp' }),
    projectId: text('project_id'),
    representativeId: text('representative_id'),
    commissionTotal: real('commission_total'),
    firstPaymentAmount: real('first_payment_amount'),
    thirdInstallmentAmount: real('third_installment_amount'),
    firstPaymentStatus: text('first_payment_status').default('pendente'),
    thirdPaymentStatus: text('third_payment_status').default('pendente'),
    firstPaymentDate: integer('first_payment_date', { mode: 'timestamp' }),
    thirdPaymentDate: integer('third_payment_date', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('commissions_user_idx').on(t.userId),
    index('commissions_period_idx').on(t.periodStart, t.periodEnd),
]);

// ─── 26. AUDIT LOGS ───────────────────────────────────────
export const auditLogs = sqliteTable('audit_logs', {
    id: integer('id', { mode: 'number' }).primaryKey(),
    userId: text('user_id').references(() => users.id),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    changes: text('changes', { mode: 'json' }).$type<Record<string, { old: unknown; new: unknown }>>(),
    fieldName: text('field_name'),
    oldValue: text('old_value'),
    newValue: text('new_value'),
    justification: text('justification'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('audit_user_idx').on(t.userId),
    index('audit_entity_idx').on(t.entityType, t.entityId),
    index('audit_created_idx').on(t.createdAt),
]);

// ─── 27. IDEAS (Roadmap) ──────────────────────────────────
export const ideas = sqliteTable('ideas', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: ['backlog', 'planned', 'in_development', 'completed'] }).notNull().default('backlog'),
    upvotes: integer('upvotes').notNull().default(0),
    downvotes: integer('downvotes').notNull().default(0),
    submittedByUserId: text('submitted_by_user_id').references(() => users.id),
    linkedClientRequests: integer('linked_client_requests').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 28. WIKI ARTICLES ────────────────────────────────────
export const wikiArticles = sqliteTable('wiki_articles', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    category: text('category'),
    content: text('content').notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
    authorId: text('author_id').references(() => users.id),
    isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('wiki_slug_idx').on(t.slug),
    index('wiki_category_idx').on(t.category),
]);

// ─── 29. SYSTEM TEMPLATES ─────────────────────────────────
export const systemTemplates = sqliteTable('system_templates', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    name: text('name').notNull(),
    systemType: text('system_type', { enum: [
    'scheduling', 'orders_delivery', 'crm', 'inventory', 'pos', 'whatsapp_bot', 'landing_page', 'ads_management',
] }).notNull(),
    description: text('description'),
    version: text('version'),
    price: real('price'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    features: text('features', { mode: 'json' }).$type<string[]>().default([]),
    provisioningScript: text('provisioning_script'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 30. ONBOARDING PROCESSES ─────────────────────────────
export const onboardingProcesses = sqliteTable('onboarding_processes', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    status: text('status', { enum: [
    'data_collection', 'system_config', 'training', 'testing', 'go_live', 'first_mentorship', 'completed',
] }).notNull().default('data_collection'),
    checklist: text('checklist', { mode: 'json' }).$type<{ step: string; completed: boolean; completedAt?: string }[]>().default([]),
    assignedToId: text('assigned_to_id').references(() => users.id),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('onboarding_tenant_idx').on(t.tenantId),
]);

// ─── 31. PAYMENTS ─────────────────────────────────────────
export const payments = sqliteTable('payments', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    contractId: text('contract_id').references(() => clientContracts.id),
    amount: real('amount').notNull(),
    dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
    paidAt: integer('paid_at', { mode: 'timestamp' }),
    isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
    method: text('method'),
    reference: text('reference'),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('payments_tenant_idx').on(t.tenantId),
    index('payments_due_idx').on(t.dueDate),
    index('payments_paid_idx').on(t.isPaid),
]);

// ─── 32. OPERATIONAL COSTS ────────────────────────────────
export const operationalCosts = sqliteTable('operational_costs', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    category: text('category').notNull(),
    description: text('description').notNull(),
    amount: real('amount').notNull(),
    isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(true),
    periodMonth: integer('period_month'),
    periodYear: integer('period_year'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
});

// ─── 33. REFRESH TOKENS ───────────────────────────────────
export const refreshTokens = sqliteTable('refresh_tokens', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    userId: text('user_id').notNull().references(() => users.id),
    token: text('token').notNull().unique(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('refresh_tokens_user_idx').on(t.userId),
    index('refresh_tokens_token_idx').on(t.token),
]);

// ─── NEW ENUMS FOR PROSPECTOR ─────────────────────────────



// ─── 34. PROSPECT CAMPAIGNS ───────────────────────────────
export const prospectCampaigns = sqliteTable('prospect_campaigns', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    name: text('name').notNull(),
    channelType: text('channel_type', { enum: ['whatsapp', 'email', 'instagram', 'facebook'] }).notNull().default('whatsapp'),
    status: text('status', { enum: ['pending', 'processing', 'active', 'waiting_response', 'paused', 'completed', 'failed'] }).notNull().default('pending'),
    playbookBasePrompt: text('playbook_base_prompt'),
    playbookStages: text('playbook_stages', { mode: 'json' }).$type<{ stage: number; prompt: string }[]>().default([]),
    sendRatePerHour: integer('send_rate_per_hour').notNull().default(50),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('prospect_camp_tenant_idx').on(t.tenantId),
]);

// ─── 35. PROSPECT CONTACTS ────────────────────────────────
export const prospectContacts = sqliteTable('prospect_contacts', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    name: text('name').notNull(),
    phone: text('phone'),
    email: text('email'),
    company: text('company'),
    optIn: integer('opt_in', { mode: 'boolean' }).notNull().default(false),
    optInAt: integer('opt_in_at', { mode: 'timestamp' }),
    optInIp: text('opt_in_ip'),
    tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
    customVariables: text('custom_variables', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    status: text('status', { enum: ['pending', 'processing', 'active', 'waiting_response', 'paused', 'completed', 'failed'] }).notNull().default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('prospect_cont_tenant_idx').on(t.tenantId),
    index('prospect_cont_phone_idx').on(t.phone),
]);

// ─── 36. PROSPECT QUEUES ──────────────────────────────────
export const prospectQueues = sqliteTable('prospect_queues', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    campaignId: text('campaign_id').notNull().references(() => prospectCampaigns.id),
    contactId: text('contact_id').notNull().references(() => leads.id),
    channelType: text('channel_type', { enum: ['whatsapp', 'email', 'instagram', 'facebook'] }).notNull().default('whatsapp'),
    status: text('status', { enum: ['pending', 'processing', 'active', 'waiting_response', 'paused', 'completed', 'failed'] }).notNull().default('pending'),
    priority: integer('priority').notNull().default(0),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    lastError: text('last_error'),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('prospect_queue_tenant_idx').on(t.tenantId),
    index('prospect_queue_status_idx').on(t.status),
    index('prospect_queue_sched_idx').on(t.scheduledAt),
]);

// ─── 37. PROSPECT LOGS (Audit & Funnel) ───────────────────
export const prospectLogs = sqliteTable('prospect_logs', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    tenantId: text('tenant_id').notNull().references(() => tenants.id),
    campaignId: text('campaign_id').references(() => prospectCampaigns.id),
    contactId: text('contact_id').references(() => prospectContacts.id),
    event: text('event').notNull(),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('prospect_logs_tenant_idx').on(t.tenantId),
    index('prospect_logs_contact_idx').on(t.contactId),
]);

// ─── 38. REPRESENTATIVES ──────────────────────────────────
export const representatives = sqliteTable('representatives', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    userId: text('user_id').notNull().references(() => users.id),
    displayName: text('display_name'),
    commissionPercent: real('commission_percent').default('15.0'),
    code: text('code').unique(),
    notes: text('notes'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    uniqueIndex('rep_user_idx').on(t.userId),
    uniqueIndex('rep_code_idx').on(t.code),
]);

// ─── 39. PROJECTS ─────────────────────────────────────────


export const projects = sqliteTable('projects', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').notNull().references(() => leads.id),
    totalValue: real('total_value'),
    entryValue: real('entry_value'),
    installmentsCount: integer('installments_count'),
    installmentValue: real('installment_value'),
    status: text('status', { enum: ['negociacao', 'fechado', 'implantacao', 'concluido'] }).notNull().default('negociacao'),
    representativeId: text('representative_id').references(() => representatives.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('projects_lead_idx').on(t.leadId),
    index('projects_rep_idx').on(t.representativeId),
]);

// ─── 40. LEAD ACTIVITIES (Tentativas de Contato) ──────────
export const leadActivities = sqliteTable('lead_activities', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').notNull().references(() => leads.id),
    userId: text('user_id').notNull().references(() => users.id),
    canal: text('canal').notNull(), // 'whatsapp' | 'ligacao' | 'email' | 'outro'
    resultado: text('resultado').notNull(), // 'sem_resposta' | 'conversou' | 'pediu_retorno' | 'sem_interesse' | 'outro'
    observacao: text('observacao'),
    contactedAt: integer('contacted_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('lead_activities_lead_idx').on(t.leadId),
    index('lead_activities_user_idx').on(t.userId),
    index('lead_activities_contacted_idx').on(t.contactedAt),
]);

// ─── 41. LEAD NOTES ───────────────────────────────────────
export const leadNotes = sqliteTable('lead_notes', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').notNull().references(() => leads.id),
    userId: text('user_id').notNull().references(() => users.id),
    texto: text('texto').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('lead_notes_lead_idx').on(t.leadId),
]);

// ─── 42. LEAD PROPOSALS ──────────────────────────────────
export const leadProposals = sqliteTable('lead_proposals', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').notNull().references(() => leads.id),
    createdByAdminId: text('created_by_admin_id').notNull().references(() => users.id),
    tipo: text('tipo').notNull(), // 'pdf' | 'link'
    arquivoPdfUrl: text('arquivo_pdf_url'),
    url: text('url'),
    statusProposta: text('status_proposta'),
    observacaoAdmin: text('observacao_admin'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('lead_proposals_lead_idx').on(t.leadId),
]);

// ─── 43. PROPOSAL ADJUSTMENT REQUESTS ────────────────────
export const proposalAdjustmentRequests = sqliteTable('proposal_adjustment_requests', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').notNull().references(() => leads.id),
    representanteId: text('representante_id').notNull().references(() => users.id),
    mensagem: text('mensagem').notNull(),
    status: text('status').notNull().default('pendente'), // pendente | atendido | recusado
    adminResponse: text('admin_response'),
    respondedAt: integer('responded_at', { mode: 'timestamp' }),
    respondedByAdminId: text('responded_by_admin_id').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('prop_adj_lead_idx').on(t.leadId),
    index('prop_adj_status_idx').on(t.status),
]);

// ─── 44. DELETE REQUESTS ─────────────────────────────────
export const deleteRequests = sqliteTable('delete_requests', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    leadId: text('lead_id').notNull().references(() => leads.id),
    representanteId: text('representante_id').notNull().references(() => users.id),
    motivo: text('motivo').notNull(),
    status: text('status').notNull().default('pendente'), // pendente | aprovado | recusado
    decidedAt: integer('decided_at', { mode: 'timestamp' }),
    decidedByAdminId: text('decided_by_admin_id').references(() => users.id),
    adminMotivo: text('admin_motivo'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
}, (t) => [
    index('delete_req_lead_idx').on(t.leadId),
    index('delete_req_status_idx').on(t.status),
]);

// ─── 45. CITY PRESENTATIONS ─────────────────────────────
export const cityPresentations = sqliteTable('city_presentations', {
    id: text('id').primaryKey().default(sql`(lower(hex(randomblob(16))))`),
    cidade: text('cidade').notNull().unique(),
    link: text('link').notNull(),
    ativo: integer('ativo', { mode: 'boolean' }).notNull().default(true),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
    updatedByAdminId: text('updated_by_admin_id').references(() => users.id),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(cast(strftime('%s', 'now') as integer))`),
});
