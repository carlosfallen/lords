// ============================================================
// Império Lord Master CRM — Shared Types & Enums
// ============================================================

// ─── RBAC Roles ──────────────────────────────────────────────
export const USER_ROLES = [
    'super_admin',
    'admin',
    'mentor',
    'support',
    'finance',
    'client_owner',
    'client_staff',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// ─── Lead Temperature ───────────────────────────────────────
export const LEAD_TEMPERATURES = ['cold', 'warm', 'hot', 'cooled'] as const;
export type LeadTemperature = (typeof LEAD_TEMPERATURES)[number];

// ─── Traction Score Bands ───────────────────────────────────
export const TRACTION_BANDS = ['accelerating', 'stable', 'stagnant', 'collapsing'] as const;
export type TractionBand = (typeof TRACTION_BANDS)[number];

export function getTractionBand(score: number): TractionBand {
    if (score >= 75) return 'accelerating';
    if (score >= 50) return 'stable';
    if (score >= 25) return 'stagnant';
    return 'collapsing';
}

// ─── Client Segments ────────────────────────────────────────
export const CLIENT_SEGMENTS = ['champion', 'growing', 'at_risk', 'inactive', 'critical'] as const;
export type ClientSegment = (typeof CLIENT_SEGMENTS)[number];

// ─── Funnel Stages ──────────────────────────────────────────
export const DEFAULT_FUNNEL_STAGES = [
    'capture',
    'reception',
    'qualification',
    'presentation',
    'proposal',
    'negotiation',
    'closing',
    'post_sale',
] as const;
export type FunnelStageKey = (typeof DEFAULT_FUNNEL_STAGES)[number];

// ─── Deal Status ────────────────────────────────────────────
export const DEAL_STATUSES = ['open', 'won', 'lost', 'stale'] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

// ─── Ticket ─────────────────────────────────────────────────
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_STATUSES = ['open', 'in_progress', 'waiting_client', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// ─── Mission / Mentorship Task ──────────────────────────────
export const MISSION_PRIORITIES = ['urgent', 'high', 'normal'] as const;
export type MissionPriority = (typeof MISSION_PRIORITIES)[number];

export const MISSION_STATUSES = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

// ─── Bot ────────────────────────────────────────────────────
export const BOT_CONNECTION_STATUSES = ['connected', 'reconnecting', 'disconnected'] as const;
export type BotConnectionStatus = (typeof BOT_CONNECTION_STATUSES)[number];

export const BOT_TRAILS = ['sale', 'support', 'mentorship'] as const;
export type BotTrail = (typeof BOT_TRAILS)[number];

export const BOT_INTENTS = [
    'interest_service',
    'problem_report',
    'price_inquiry',
    'schedule',
    'technical_support',
    'mentorship',
    'objection',
    'exit',
    'undefined',
] as const;
export type BotIntent = (typeof BOT_INTENTS)[number];

// ─── System Product Types ───────────────────────────────────
export const SYSTEM_TYPES = [
    'scheduling',
    'orders_delivery',
    'crm',
    'inventory',
    'pos',
    'whatsapp_bot',
    'landing_page',
    'ads_management',
] as const;
export type SystemType = (typeof SYSTEM_TYPES)[number];

// ─── Product Status ─────────────────────────────────────────
export const PRODUCT_STATUSES = ['active', 'in_development', 'discontinued'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

// ─── Contract Status ────────────────────────────────────────
export const CONTRACT_STATUSES = ['active', 'suspended', 'cancelled', 'expired'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

// ─── Provisioning Status ────────────────────────────────────
export const PROVISIONING_STATUSES = [
    'configuring',
    'awaiting_data',
    'training',
    'delivered',
    'active',
] as const;
export type ProvisioningStatus = (typeof PROVISIONING_STATUSES)[number];

// ─── Onboarding Status ─────────────────────────────────────
export const ONBOARDING_STATUSES = [
    'data_collection',
    'system_config',
    'training',
    'testing',
    'go_live',
    'first_mentorship',
    'completed',
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

// ─── Campaign Source ────────────────────────────────────────
export const CAMPAIGN_SOURCES = [
    'meta_ads',
    'google_ads',
    'organic_instagram',
    'referral',
    'whatsapp_direct',
    'other',
] as const;
export type CampaignSource = (typeof CAMPAIGN_SOURCES)[number];

// ─── Idea Status ────────────────────────────────────────────
export const IDEA_STATUSES = ['backlog', 'planned', 'in_development', 'completed'] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

// ─── Loss Reasons ───────────────────────────────────────────
export const LOSS_REASONS = ['price', 'competition', 'no_interest', 'no_response', 'timing', 'other'] as const;
export type LossReason = (typeof LOSS_REASONS)[number];

// ─── Alert Severity ─────────────────────────────────────────
export const ALERT_SEVERITIES = ['critical', 'warning', 'info'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

// ─── NPS Score Category ─────────────────────────────────────
export function getNpsCategory(score: number): 'detractor' | 'passive' | 'promoter' {
    if (score <= 6) return 'detractor';
    if (score <= 8) return 'passive';
    return 'promoter';
}

// ─── WebSocket Event Types ──────────────────────────────────
export const WS_EVENTS = {
    // Dashboard
    DASHBOARD_UPDATE: 'dashboard:update',
    KPI_REFRESH: 'kpi:refresh',

    // Leads
    LEAD_NEW: 'lead:new',
    LEAD_UPDATED: 'lead:updated',
    LEAD_TEMPERATURE_CHANGED: 'lead:temperature_changed',

    // Bot
    BOT_STATUS: 'bot:status',
    BOT_MESSAGE_IN: 'bot:message_in',
    BOT_MESSAGE_OUT: 'bot:message_out',

    // Alerts
    ALERT_NEW: 'alert:new',
    BOTTLENECK_DETECTED: 'bottleneck:detected',

    // Missions
    MISSION_COMPLETED: 'mission:completed',
    MISSION_OVERDUE: 'mission:overdue',

    // Pipeline
    DEAL_MOVED: 'deal:moved',
    DEAL_WON: 'deal:won',

    // Tickets
    TICKET_NEW: 'ticket:new',
    TICKET_UPDATED: 'ticket:updated',

    // Connection
    AUTH: 'auth',
    PING: 'ping',
    PONG: 'pong',
} as const;

// ─── API Response Types ─────────────────────────────────────
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

export interface DashboardKPIs {
    mrr: number;
    arr: number;
    totalActiveClients: number;
    monthlyChurn: number;
    averageNps: number;
    mrrGrowth: number;
    newLeadsToday: number;
    pendingMissions: number;
    openTickets: number;
    botStatus: BotConnectionStatus;
}

export interface ClientGridItem {
    id: string;
    name: string;
    niche: string;
    city: string;
    state: string;
    systemsCount: number;
    mrr: number;
    tractionScore: number;
    temperature: string;
    lastInteraction: string;
    nextAction: string;
    mentorName: string;
    tags: string[];
    segment: ClientSegment;
}

export interface ConversationPreview {
    id: string;
    contactName: string;
    contactPhone: string;
    temperature: LeadTemperature;
    trail: BotTrail;
    currentStage: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    mentorName: string;
}
