CREATE TYPE "public"."alert_severity" AS ENUM('critical', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "public"."bot_connection_status" AS ENUM('connected', 'reconnecting', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."bot_trail" AS ENUM('sale', 'support', 'mentorship');--> statement-breakpoint
CREATE TYPE "public"."campaign_source" AS ENUM('meta_ads', 'google_ads', 'organic_instagram', 'referral', 'whatsapp_direct', 'other');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('active', 'suspended', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."deal_status" AS ENUM('open', 'won', 'lost', 'stale');--> statement-breakpoint
CREATE TYPE "public"."idea_status" AS ENUM('backlog', 'planned', 'in_development', 'completed');--> statement-breakpoint
CREATE TYPE "public"."lead_temperature" AS ENUM('cold', 'warm', 'hot', 'cooled');--> statement-breakpoint
CREATE TYPE "public"."loss_reason" AS ENUM('price', 'competition', 'no_interest', 'no_response', 'timing', 'other');--> statement-breakpoint
CREATE TYPE "public"."mission_priority" AS ENUM('urgent', 'high', 'normal');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('pending', 'in_progress', 'completed', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."onboarding_status" AS ENUM('data_collection', 'system_config', 'training', 'testing', 'go_live', 'first_mentorship', 'completed');--> statement-breakpoint
CREATE TYPE "public"."provisioning_status" AS ENUM('configuring', 'awaiting_data', 'training', 'delivered', 'active');--> statement-breakpoint
CREATE TYPE "public"."system_type" AS ENUM('scheduling', 'orders_delivery', 'crm', 'inventory', 'pos', 'whatsapp_bot', 'landing_page', 'ads_management');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'waiting_client', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'admin', 'mentor', 'support', 'finance', 'client_owner', 'client_staff');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" varchar(100),
	"changes" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_health_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"event_type" varchar(50) NOT NULL,
	"reason" text,
	"duration_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instance_name" varchar(100) NOT NULL,
	"status" "bot_connection_status" DEFAULT 'disconnected' NOT NULL,
	"phone_number" varchar(30),
	"connected_at" timestamp,
	"disconnected_at" timestamp,
	"uptime_seconds" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bottleneck_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"funnel_stage_id" uuid,
	"severity" "alert_severity" NOT NULL,
	"leads_stuck" integer NOT NULL,
	"estimated_revenue_lost" numeric(14, 2),
	"hours_stuck" numeric(8, 1),
	"message" text NOT NULL,
	"is_acknowledged" boolean DEFAULT false NOT NULL,
	"acknowledged_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"plan_name" varchar(100) NOT NULL,
	"monthly_value" numeric(12, 2) NOT NULL,
	"status" "contract_status" DEFAULT 'active' NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"renewal_date" timestamp,
	"payment_day" smallint DEFAULT 10 NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"system_type" "system_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(20),
	"access_url" text,
	"status" "provisioning_status" DEFAULT 'configuring' NOT NULL,
	"delivered_at" timestamp,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(100),
	"phone" varchar(30),
	"email" varchar(255),
	"total_attendances" integer DEFAULT 0 NOT NULL,
	"conversion_rate" numeric(5, 2) DEFAULT '0',
	"avg_response_time_min" numeric(8, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"deal_id" uuid,
	"tenant_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"percentage" numeric(5, 2),
	"description" text,
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp,
	"period_start" timestamp,
	"period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals_pipeline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"title" varchar(255) NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"contact_phone" varchar(30),
	"contact_email" varchar(255),
	"product_of_interest" varchar(255),
	"proposed_value" numeric(12, 2),
	"status" "deal_status" DEFAULT 'open' NOT NULL,
	"stage" varchar(100) DEFAULT 'lead' NOT NULL,
	"temperature" "lead_temperature" DEFAULT 'cold',
	"assigned_to_id" uuid,
	"next_step" text,
	"next_step_date" timestamp,
	"won_at" timestamp,
	"lost_at" timestamp,
	"loss_reason" "loss_reason",
	"interaction_history" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"name" varchar(255) NOT NULL,
	"category" varchar(100),
	"mime_type" varchar(100),
	"file_url" text NOT NULL,
	"file_size" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"previous_version_id" uuid,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"from_stage_id" uuid,
	"to_stage_id" uuid NOT NULL,
	"moved_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"order" smallint NOT NULL,
	"color" varchar(7),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "idea_status" DEFAULT 'backlog' NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"submitted_by_user_id" uuid,
	"linked_client_requests" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"source" "campaign_source" NOT NULL,
	"budget" numeric(12, 2),
	"spent" numeric(12, 2) DEFAULT '0',
	"leads_generated" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"cpl" numeric(10, 2),
	"roi" numeric(8, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"creatives" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"direction" varchar(10) NOT NULL,
	"sender_type" varchar(20) NOT NULL,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"content" text,
	"media_url" text,
	"intent" varchar(50),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_flow_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"trail" "bot_trail" NOT NULL,
	"from_stage" varchar(50),
	"to_stage" varchar(50) NOT NULL,
	"intent" varchar(50),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"name" varchar(255),
	"phone" varchar(30) NOT NULL,
	"email" varchar(255),
	"niche" varchar(100),
	"problem_description" text,
	"product_of_interest" varchar(255),
	"temperature" "lead_temperature" DEFAULT 'cold' NOT NULL,
	"source" "campaign_source" DEFAULT 'whatsapp_direct',
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"current_funnel_stage_id" uuid,
	"assigned_to_id" uuid,
	"estimated_value" numeric(12, 2),
	"loss_reason" "loss_reason",
	"is_converted" boolean DEFAULT false NOT NULL,
	"converted_at" timestamp,
	"last_contact_at" timestamp,
	"next_follow_up_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentorship_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"mentor_id" uuid NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer,
	"pre_briefing" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"decisions" text,
	"next_steps" text,
	"traction_score_before" smallint,
	"traction_score_after" smallint,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentorship_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" "mission_priority" DEFAULT 'normal' NOT NULL,
	"status" "mission_status" DEFAULT 'pending' NOT NULL,
	"assigned_to_client_user_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"playbook_id" uuid,
	"due_date" timestamp,
	"completed_at" timestamp,
	"checklist" jsonb DEFAULT '[]'::jsonb,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"blocks_access" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "money_on_table_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"total_lost" numeric(14, 2) NOT NULL,
	"unanswered_leads_loss" numeric(14, 2),
	"no_show_loss" numeric(14, 2),
	"stuck_leads_loss" numeric(14, 2),
	"stuck_inventory_loss" numeric(14, 2),
	"low_conversion_loss" numeric(14, 2),
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nps_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"comment" text,
	"trigger" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_processes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"status" "onboarding_status" DEFAULT 'data_collection' NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb,
	"assigned_to_id" uuid,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"is_recurring" boolean DEFAULT true NOT NULL,
	"period_month" smallint,
	"period_year" smallint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contract_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"is_paid" boolean DEFAULT false NOT NULL,
	"method" varchar(50),
	"reference" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"niche" varchar(100),
	"content" text NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playbooks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"assigned_to_id" uuid,
	"created_by_user_id" uuid,
	"system_type" "system_type",
	"sla_first_response_hours" integer,
	"sla_resolution_hours" integer,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"csat_score" smallint,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"system_type" "system_type" NOT NULL,
	"description" text,
	"version" varchar(20),
	"price" numeric(12, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb,
	"provisioning_script" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"position" varchar(100),
	"department" varchar(100),
	"clients_managed" integer DEFAULT 0 NOT NULL,
	"missions_sent" integer DEFAULT 0 NOT NULL,
	"sessions_completed" integer DEFAULT 0 NOT NULL,
	"avg_client_traction_score" numeric(5, 2),
	"monthly_goals" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"trade_name" varchar(255),
	"niche" varchar(100),
	"document" varchar(20),
	"email" varchar(255),
	"phone" varchar(30),
	"city" varchar(100),
	"state" varchar(2),
	"address" text,
	"logo_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"segment" varchar(50),
	"mentor_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traction_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"new_leads_score" numeric(5, 2),
	"funnel_conversion_score" numeric(5, 2),
	"response_time_score" numeric(5, 2),
	"mission_execution_score" numeric(5, 2),
	"revenue_growth_score" numeric(5, 2),
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'support' NOT NULL,
	"avatar_url" text,
	"phone" varchar(30),
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" uuid,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wiki_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"category" varchar(100),
	"content" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"author_id" uuid,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_health_events" ADD CONSTRAINT "bot_health_events_session_id_bot_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."bot_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bottleneck_alerts" ADD CONSTRAINT "bottleneck_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bottleneck_alerts" ADD CONSTRAINT "bottleneck_alerts_funnel_stage_id_funnel_stages_id_fk" FOREIGN KEY ("funnel_stage_id") REFERENCES "public"."funnel_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bottleneck_alerts" ADD CONSTRAINT "bottleneck_alerts_acknowledged_by_user_id_users_id_fk" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contracts" ADD CONSTRAINT "client_contracts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_products" ADD CONSTRAINT "client_products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_team_members" ADD CONSTRAINT "client_team_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_deal_id_deals_pipeline_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals_pipeline"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals_pipeline" ADD CONSTRAINT "deals_pipeline_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals_pipeline" ADD CONSTRAINT "deals_pipeline_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_from_stage_id_funnel_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."funnel_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_to_stage_id_funnel_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."funnel_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_events" ADD CONSTRAINT "funnel_events_moved_by_user_id_users_id_fk" FOREIGN KEY ("moved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funnel_stages" ADD CONSTRAINT "funnel_stages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_conversations" ADD CONSTRAINT "lead_conversations_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_flow_events" ADD CONSTRAINT "lead_flow_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_sessions" ADD CONSTRAINT "mentorship_sessions_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_tasks" ADD CONSTRAINT "mentorship_tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_tasks" ADD CONSTRAINT "mentorship_tasks_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorship_tasks" ADD CONSTRAINT "mentorship_tasks_playbook_id_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "money_on_table_snapshots" ADD CONSTRAINT "money_on_table_snapshots_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_processes" ADD CONSTRAINT "onboarding_processes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_processes" ADD CONSTRAINT "onboarding_processes_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_contract_id_client_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."client_contracts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traction_scores" ADD CONSTRAINT "traction_scores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_articles" ADD CONSTRAINT "wiki_articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bot_health_session_idx" ON "bot_health_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "bot_health_created_idx" ON "bot_health_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "bottleneck_tenant_idx" ON "bottleneck_alerts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "bottleneck_severity_idx" ON "bottleneck_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "contracts_tenant_idx" ON "client_contracts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "contracts_status_idx" ON "client_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_tenant_idx" ON "client_products" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "client_team_tenant_idx" ON "client_team_members" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "commissions_user_idx" ON "commissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "commissions_period_idx" ON "commissions" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "deals_status_idx" ON "deals_pipeline" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deals_assigned_idx" ON "deals_pipeline" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "deals_stage_idx" ON "deals_pipeline" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "documents_tenant_idx" ON "documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "documents_category_idx" ON "documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "funnel_events_lead_idx" ON "funnel_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "funnel_events_created_idx" ON "funnel_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "funnel_stages_tenant_idx" ON "funnel_stages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversations_lead_idx" ON "lead_conversations" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "conversations_created_idx" ON "lead_conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "flow_events_lead_idx" ON "lead_flow_events" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "leads_tenant_idx" ON "leads" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "leads_temperature_idx" ON "leads" USING btree ("temperature");--> statement-breakpoint
CREATE INDEX "leads_assigned_idx" ON "leads" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_tenant_idx" ON "mentorship_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sessions_mentor_idx" ON "mentorship_sessions" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "missions_tenant_idx" ON "mentorship_tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "missions_status_idx" ON "mentorship_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mot_tenant_idx" ON "money_on_table_snapshots" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "nps_tenant_idx" ON "nps_responses" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "onboarding_tenant_idx" ON "onboarding_processes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payments_tenant_idx" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "payments_due_idx" ON "payments" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "payments_paid_idx" ON "payments" USING btree ("is_paid");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "tickets_tenant_idx" ON "support_tickets" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "support_tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_assigned_idx" ON "support_tickets" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_user_idx" ON "team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tenants_niche_idx" ON "tenants" USING btree ("niche");--> statement-breakpoint
CREATE INDEX "tenants_mentor_idx" ON "tenants" USING btree ("mentor_id");--> statement-breakpoint
CREATE INDEX "tenants_segment_idx" ON "tenants" USING btree ("segment");--> statement-breakpoint
CREATE INDEX "traction_tenant_idx" ON "traction_scores" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "traction_calculated_idx" ON "traction_scores" USING btree ("calculated_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "wiki_slug_idx" ON "wiki_articles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "wiki_category_idx" ON "wiki_articles" USING btree ("category");