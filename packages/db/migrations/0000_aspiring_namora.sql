CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`changes` text,
	`field_name` text,
	`old_value` text,
	`new_value` text,
	`justification` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_user_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `bot_health_events` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`session_id` text,
	`event_type` text NOT NULL,
	`reason` text,
	`duration_seconds` integer,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `bot_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bot_health_session_idx` ON `bot_health_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `bot_health_created_idx` ON `bot_health_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `bot_sessions` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`instance_name` text NOT NULL,
	`status` text DEFAULT 'disconnected' NOT NULL,
	`phone_number` text,
	`connected_at` integer,
	`disconnected_at` integer,
	`uptime_seconds` integer,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bottleneck_alerts` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text,
	`funnel_stage_id` text,
	`severity` text NOT NULL,
	`leads_stuck` integer NOT NULL,
	`estimated_revenue_lost` real,
	`hours_stuck` real,
	`message` text NOT NULL,
	`is_acknowledged` integer DEFAULT false NOT NULL,
	`acknowledged_by_user_id` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`funnel_stage_id`) REFERENCES `funnel_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`acknowledged_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `bottleneck_tenant_idx` ON `bottleneck_alerts` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `bottleneck_severity_idx` ON `bottleneck_alerts` (`severity`);--> statement-breakpoint
CREATE TABLE `city_presentations` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`cidade` text NOT NULL,
	`link` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_by_admin_id` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`updated_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `city_presentations_cidade_unique` ON `city_presentations` (`cidade`);--> statement-breakpoint
CREATE TABLE `client_contracts` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`plan_name` text NOT NULL,
	`monthly_value` real NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`renewal_date` integer,
	`payment_day` integer DEFAULT 10 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `contracts_tenant_idx` ON `client_contracts` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `contracts_status_idx` ON `client_contracts` (`status`);--> statement-breakpoint
CREATE TABLE `client_products` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`system_type` text NOT NULL,
	`name` text NOT NULL,
	`version` text,
	`access_url` text,
	`status` text DEFAULT 'configuring' NOT NULL,
	`delivered_at` integer,
	`config` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `products_tenant_idx` ON `client_products` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `client_team_members` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`phone` text,
	`email` text,
	`total_attendances` integer DEFAULT 0 NOT NULL,
	`conversion_rate` real DEFAULT '0',
	`avg_response_time_min` real,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `client_team_tenant_idx` ON `client_team_members` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `commissions` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`deal_id` text,
	`tenant_id` text,
	`amount` real NOT NULL,
	`percentage` real,
	`description` text,
	`is_paid` integer DEFAULT false NOT NULL,
	`paid_at` integer,
	`period_start` integer,
	`period_end` integer,
	`project_id` text,
	`representative_id` text,
	`commission_total` real,
	`first_payment_amount` real,
	`third_installment_amount` real,
	`first_payment_status` text DEFAULT 'pendente',
	`third_payment_status` text DEFAULT 'pendente',
	`first_payment_date` integer,
	`third_payment_date` integer,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deal_id`) REFERENCES `deals_pipeline`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commissions_user_idx` ON `commissions` (`user_id`);--> statement-breakpoint
CREATE INDEX `commissions_period_idx` ON `commissions` (`period_start`,`period_end`);--> statement-breakpoint
CREATE TABLE `deals_pipeline` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text,
	`title` text NOT NULL,
	`contact_name` text NOT NULL,
	`contact_phone` text,
	`contact_email` text,
	`product_of_interest` text,
	`proposed_value` real,
	`status` text DEFAULT 'open' NOT NULL,
	`stage` text DEFAULT 'lead' NOT NULL,
	`temperature` text DEFAULT 'cold',
	`assigned_to_id` text,
	`next_step` text,
	`next_step_date` integer,
	`won_at` integer,
	`lost_at` integer,
	`loss_reason` text,
	`interaction_history` text DEFAULT '[]',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `deals_status_idx` ON `deals_pipeline` (`status`);--> statement-breakpoint
CREATE INDEX `deals_assigned_idx` ON `deals_pipeline` (`assigned_to_id`);--> statement-breakpoint
CREATE INDEX `deals_stage_idx` ON `deals_pipeline` (`stage`);--> statement-breakpoint
CREATE TABLE `delete_requests` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text NOT NULL,
	`representante_id` text NOT NULL,
	`motivo` text NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`decided_at` integer,
	`decided_by_admin_id` text,
	`admin_motivo` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`representante_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`decided_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `delete_req_lead_idx` ON `delete_requests` (`lead_id`);--> statement-breakpoint
CREATE INDEX `delete_req_status_idx` ON `delete_requests` (`status`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text,
	`name` text NOT NULL,
	`category` text,
	`mime_type` text,
	`file_url` text NOT NULL,
	`file_size` integer,
	`version` integer DEFAULT 1 NOT NULL,
	`previous_version_id` text,
	`uploaded_by_user_id` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `documents_tenant_idx` ON `documents` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `documents_category_idx` ON `documents` (`category`);--> statement-breakpoint
CREATE TABLE `funnel_events` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text NOT NULL,
	`from_stage_id` text,
	`to_stage_id` text NOT NULL,
	`moved_by_user_id` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_stage_id`) REFERENCES `funnel_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_stage_id`) REFERENCES `funnel_stages`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`moved_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `funnel_events_lead_idx` ON `funnel_events` (`lead_id`);--> statement-breakpoint
CREATE INDEX `funnel_events_created_idx` ON `funnel_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `funnel_stages` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`order` integer NOT NULL,
	`color` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `funnel_stages_tenant_idx` ON `funnel_stages` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'backlog' NOT NULL,
	`upvotes` integer DEFAULT 0 NOT NULL,
	`downvotes` integer DEFAULT 0 NOT NULL,
	`submitted_by_user_id` text,
	`linked_client_requests` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `internal_campaigns` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`budget` real,
	`spent` real DEFAULT '0',
	`leads_generated` integer DEFAULT 0 NOT NULL,
	`conversions` integer DEFAULT 0 NOT NULL,
	`cpl` real,
	`roi` real,
	`is_active` integer DEFAULT true NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`creatives` text DEFAULT '[]',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text NOT NULL,
	`user_id` text NOT NULL,
	`canal` text NOT NULL,
	`resultado` text NOT NULL,
	`observacao` text,
	`contacted_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_activities_lead_idx` ON `lead_activities` (`lead_id`);--> statement-breakpoint
CREATE INDEX `lead_activities_user_idx` ON `lead_activities` (`user_id`);--> statement-breakpoint
CREATE INDEX `lead_activities_contacted_idx` ON `lead_activities` (`contacted_at`);--> statement-breakpoint
CREATE TABLE `lead_conversations` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text NOT NULL,
	`direction` text NOT NULL,
	`sender_type` text NOT NULL,
	`message_type` text DEFAULT 'text' NOT NULL,
	`content` text,
	`media_url` text,
	`intent` text,
	`is_read` integer DEFAULT false NOT NULL,
	`wa_message_id` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `conversations_lead_idx` ON `lead_conversations` (`lead_id`);--> statement-breakpoint
CREATE INDEX `conversations_created_idx` ON `lead_conversations` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_wa_msg_idx` ON `lead_conversations` (`wa_message_id`);--> statement-breakpoint
CREATE TABLE `lead_flow_events` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text NOT NULL,
	`trail` text NOT NULL,
	`from_stage` text,
	`to_stage` text NOT NULL,
	`intent` text,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `flow_events_lead_idx` ON `lead_flow_events` (`lead_id`);--> statement-breakpoint
CREATE TABLE `lead_notes` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text NOT NULL,
	`user_id` text NOT NULL,
	`texto` text NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_notes_lead_idx` ON `lead_notes` (`lead_id`);--> statement-breakpoint
CREATE TABLE `lead_proposals` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text NOT NULL,
	`created_by_admin_id` text NOT NULL,
	`tipo` text NOT NULL,
	`arquivo_pdf_url` text,
	`url` text,
	`status_proposta` text,
	`observacao_admin` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_proposals_lead_idx` ON `lead_proposals` (`lead_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text,
	`name` text,
	`phone` text NOT NULL,
	`email` text,
	`niche` text,
	`problem_description` text,
	`product_of_interest` text,
	`temperature` text DEFAULT 'cold' NOT NULL,
	`source` text DEFAULT 'whatsapp_direct',
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`current_funnel_stage_id` text,
	`assigned_to_id` text,
	`estimated_value` real,
	`loss_reason` text,
	`is_converted` integer DEFAULT false NOT NULL,
	`converted_at` integer,
	`last_contact_at` integer,
	`diagnostic_sold` integer DEFAULT false NOT NULL,
	`diagnostic_paid` integer DEFAULT false NOT NULL,
	`diagnostic_scheduled_at` integer,
	`diagnostic_completed_at` integer,
	`representative_id` text,
	`cidade` text,
	`observacao_inicial` text,
	`motivo_perda_texto` text,
	`snooze_until` integer,
	`snooze_motivo` text,
	`status` text DEFAULT 'ativo' NOT NULL,
	`next_follow_up_at` integer,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `leads_phone_idx` ON `leads` (`phone`);--> statement-breakpoint
CREATE INDEX `leads_tenant_idx` ON `leads` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `leads_temperature_idx` ON `leads` (`temperature`);--> statement-breakpoint
CREATE INDEX `leads_assigned_idx` ON `leads` (`assigned_to_id`);--> statement-breakpoint
CREATE INDEX `leads_created_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `leads_updated_tenant_idx` ON `leads` (`tenant_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `leads_not_converted_idx` ON `leads` (`is_converted`) WHERE "leads"."is_converted" IS FALSE;--> statement-breakpoint
CREATE UNIQUE INDEX `leads_phone_tenant_unique_idx` ON `leads` (`phone`,`tenant_id`);--> statement-breakpoint
CREATE TABLE `mentorship_sessions` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`mentor_id` text NOT NULL,
	`scheduled_at` integer NOT NULL,
	`duration_minutes` integer,
	`pre_briefing` text DEFAULT '{}',
	`notes` text,
	`decisions` text,
	`next_steps` text,
	`traction_score_before` integer,
	`traction_score_after` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mentor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_tenant_idx` ON `mentorship_sessions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `sessions_mentor_idx` ON `mentorship_sessions` (`mentor_id`);--> statement-breakpoint
CREATE TABLE `mentorship_tasks` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'normal' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`assigned_to_client_user_id` text,
	`created_by_user_id` text NOT NULL,
	`playbook_id` text,
	`due_date` integer,
	`completed_at` integer,
	`checklist` text DEFAULT '[]',
	`attachments` text DEFAULT '[]',
	`blocks_access` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`playbook_id`) REFERENCES `playbooks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `missions_tenant_idx` ON `mentorship_tasks` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `missions_status_idx` ON `mentorship_tasks` (`status`);--> statement-breakpoint
CREATE TABLE `money_on_table_snapshots` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`total_lost` real NOT NULL,
	`unanswered_leads_loss` real,
	`no_show_loss` real,
	`stuck_leads_loss` real,
	`stuck_inventory_loss` real,
	`low_conversion_loss` real,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`calculated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mot_tenant_idx` ON `money_on_table_snapshots` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `nps_responses` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`score` integer NOT NULL,
	`comment` text,
	`trigger` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `nps_tenant_idx` ON `nps_responses` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `onboarding_processes` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`status` text DEFAULT 'data_collection' NOT NULL,
	`checklist` text DEFAULT '[]',
	`assigned_to_id` text,
	`started_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `onboarding_tenant_idx` ON `onboarding_processes` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `operational_costs` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount` real NOT NULL,
	`is_recurring` integer DEFAULT true NOT NULL,
	`period_month` integer,
	`period_year` integer,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`contract_id` text,
	`amount` real NOT NULL,
	`due_date` integer NOT NULL,
	`paid_at` integer,
	`is_paid` integer DEFAULT false NOT NULL,
	`method` text,
	`reference` text,
	`notes` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `client_contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payments_tenant_idx` ON `payments` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `payments_due_idx` ON `payments` (`due_date`);--> statement-breakpoint
CREATE INDEX `payments_paid_idx` ON `payments` (`is_paid`);--> statement-breakpoint
CREATE TABLE `playbooks` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`category` text,
	`niche` text,
	`content` text NOT NULL,
	`steps` text DEFAULT '[]',
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playbooks_slug_unique` ON `playbooks` (`slug`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text NOT NULL,
	`total_value` real,
	`entry_value` real,
	`installments_count` integer,
	`installment_value` real,
	`status` text DEFAULT 'negociacao' NOT NULL,
	`representative_id` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`representative_id`) REFERENCES `representatives`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `projects_lead_idx` ON `projects` (`lead_id`);--> statement-breakpoint
CREATE INDEX `projects_rep_idx` ON `projects` (`representative_id`);--> statement-breakpoint
CREATE TABLE `proposal_adjustment_requests` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`lead_id` text NOT NULL,
	`representante_id` text NOT NULL,
	`mensagem` text NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`admin_response` text,
	`responded_at` integer,
	`responded_by_admin_id` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`representante_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responded_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `prop_adj_lead_idx` ON `proposal_adjustment_requests` (`lead_id`);--> statement-breakpoint
CREATE INDEX `prop_adj_status_idx` ON `proposal_adjustment_requests` (`status`);--> statement-breakpoint
CREATE TABLE `prospect_campaigns` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`channel_type` text DEFAULT 'whatsapp' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`playbook_base_prompt` text,
	`playbook_stages` text DEFAULT '[]',
	`send_rate_per_hour` integer DEFAULT 50 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `prospect_camp_tenant_idx` ON `prospect_campaigns` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `prospect_contacts` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`company` text,
	`opt_in` integer DEFAULT false NOT NULL,
	`opt_in_at` integer,
	`opt_in_ip` text,
	`tags` text DEFAULT '[]',
	`custom_variables` text DEFAULT '{}',
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `prospect_cont_tenant_idx` ON `prospect_contacts` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `prospect_cont_phone_idx` ON `prospect_contacts` (`phone`);--> statement-breakpoint
CREATE TABLE `prospect_logs` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`campaign_id` text,
	`contact_id` text,
	`event` text NOT NULL,
	`payload` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `prospect_campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `prospect_contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `prospect_logs_tenant_idx` ON `prospect_logs` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `prospect_logs_contact_idx` ON `prospect_logs` (`contact_id`);--> statement-breakpoint
CREATE TABLE `prospect_queues` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`campaign_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`channel_type` text DEFAULT 'whatsapp' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`max_attempts` integer DEFAULT 3 NOT NULL,
	`last_error` text,
	`scheduled_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`campaign_id`) REFERENCES `prospect_campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `prospect_queue_tenant_idx` ON `prospect_queues` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `prospect_queue_status_idx` ON `prospect_queues` (`status`);--> statement-breakpoint
CREATE INDEX `prospect_queue_sched_idx` ON `prospect_queues` (`scheduled_at`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_unique` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_user_idx` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_token_idx` ON `refresh_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `representatives` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text,
	`commission_percent` real DEFAULT '15.0',
	`code` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `representatives_code_unique` ON `representatives` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `rep_user_idx` ON `representatives` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rep_code_idx` ON `representatives` (`code`);--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_to_id` text,
	`created_by_user_id` text,
	`system_type` text,
	`sla_first_response_hours` integer,
	`sla_resolution_hours` integer,
	`first_response_at` integer,
	`resolved_at` integer,
	`closed_at` integer,
	`csat_score` integer,
	`messages` text DEFAULT '[]',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tickets_tenant_idx` ON `support_tickets` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `support_tickets` (`status`);--> statement-breakpoint
CREATE INDEX `tickets_priority_idx` ON `support_tickets` (`priority`);--> statement-breakpoint
CREATE INDEX `tickets_assigned_idx` ON `support_tickets` (`assigned_to_id`);--> statement-breakpoint
CREATE TABLE `system_templates` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`name` text NOT NULL,
	`system_type` text NOT NULL,
	`description` text,
	`version` text,
	`price` real,
	`is_active` integer DEFAULT true NOT NULL,
	`features` text DEFAULT '[]',
	`provisioning_script` text,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`user_id` text NOT NULL,
	`position` text,
	`department` text,
	`clients_managed` integer DEFAULT 0 NOT NULL,
	`missions_sent` integer DEFAULT 0 NOT NULL,
	`sessions_completed` integer DEFAULT 0 NOT NULL,
	`avg_client_traction_score` real,
	`monthly_goals` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_user_idx` ON `team_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`name` text NOT NULL,
	`trade_name` text,
	`niche` text,
	`document` text,
	`email` text,
	`phone` text,
	`city` text,
	`state` text,
	`address` text,
	`logo_url` text,
	`tags` text DEFAULT '[]',
	`segment` text,
	`mentor_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`notes` text,
	`metadata` text DEFAULT '{}',
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`mentor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tenants_niche_idx` ON `tenants` (`niche`);--> statement-breakpoint
CREATE INDEX `tenants_mentor_idx` ON `tenants` (`mentor_id`);--> statement-breakpoint
CREATE INDEX `tenants_segment_idx` ON `tenants` (`segment`);--> statement-breakpoint
CREATE TABLE `traction_scores` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`tenant_id` text NOT NULL,
	`score` integer NOT NULL,
	`new_leads_score` real,
	`funnel_conversion_score` real,
	`response_time_score` real,
	`mission_execution_score` real,
	`revenue_growth_score` real,
	`calculated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `traction_tenant_idx` ON `traction_scores` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `traction_calculated_idx` ON `traction_scores` (`calculated_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'support' NOT NULL,
	`avatar_url` text,
	`phone` text,
	`is_active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`tenant_id` text,
	`last_login_at` integer,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_tenant_idx` ON `users` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `wiki_articles` (
	`id` text PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`category` text,
	`content` text NOT NULL,
	`tags` text DEFAULT '[]',
	`author_id` text,
	`is_published` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(strftime('%s', 'now') as integer)) NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wiki_articles_slug_unique` ON `wiki_articles` (`slug`);--> statement-breakpoint
CREATE INDEX `wiki_slug_idx` ON `wiki_articles` (`slug`);--> statement-breakpoint
CREATE INDEX `wiki_category_idx` ON `wiki_articles` (`category`);