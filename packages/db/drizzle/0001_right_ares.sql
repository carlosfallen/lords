CREATE TYPE "public"."project_status" AS ENUM('negociacao', 'fechado', 'implantacao', 'concluido');--> statement-breakpoint
CREATE TYPE "public"."prospect_channel" AS ENUM('whatsapp', 'email', 'instagram', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."prospect_status" AS ENUM('pending', 'active', 'paused', 'completed', 'failed');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'gestor';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'atendimento';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'representante';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'financeiro';--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"total_value" numeric(12, 2),
	"entry_value" numeric(12, 2),
	"installments_count" integer,
	"installment_value" numeric(12, 2),
	"status" "project_status" DEFAULT 'negociacao' NOT NULL,
	"representative_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"channel_type" "prospect_channel" DEFAULT 'whatsapp' NOT NULL,
	"status" "prospect_status" DEFAULT 'pending' NOT NULL,
	"playbook_base_prompt" text,
	"playbook_stages" jsonb DEFAULT '[]'::jsonb,
	"send_rate_per_hour" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"company" varchar(255),
	"opt_in" boolean DEFAULT false NOT NULL,
	"opt_in_at" timestamp,
	"opt_in_ip" varchar(45),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"custom_variables" jsonb DEFAULT '{}'::jsonb,
	"status" "prospect_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid,
	"contact_id" uuid,
	"event" varchar(255) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"channel_type" "prospect_channel" DEFAULT 'whatsapp' NOT NULL,
	"status" "prospect_status" DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"scheduled_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "representatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" varchar(255),
	"commission_percent" numeric(5, 2) DEFAULT '15.0',
	"code" varchar(50),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "representatives_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "representative_id" uuid;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "commission_total" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "first_payment_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "third_installment_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "first_payment_status" varchar(50) DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "third_payment_status" varchar(50) DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "first_payment_date" timestamp;--> statement-breakpoint
ALTER TABLE "commissions" ADD COLUMN "third_payment_date" timestamp;--> statement-breakpoint
ALTER TABLE "lead_conversations" ADD COLUMN "wa_message_id" varchar(100);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "diagnostic_sold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "diagnostic_paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "diagnostic_scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "diagnostic_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "representative_id" uuid;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "status" varchar(50) DEFAULT 'new_lead' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_representative_id_representatives_id_fk" FOREIGN KEY ("representative_id") REFERENCES "public"."representatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_campaigns" ADD CONSTRAINT "prospect_campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_contacts" ADD CONSTRAINT "prospect_contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_logs" ADD CONSTRAINT "prospect_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_logs" ADD CONSTRAINT "prospect_logs_campaign_id_prospect_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."prospect_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_logs" ADD CONSTRAINT "prospect_logs_contact_id_prospect_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."prospect_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_queues" ADD CONSTRAINT "prospect_queues_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_queues" ADD CONSTRAINT "prospect_queues_campaign_id_prospect_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."prospect_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_queues" ADD CONSTRAINT "prospect_queues_contact_id_prospect_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."prospect_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "representatives" ADD CONSTRAINT "representatives_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_lead_idx" ON "projects" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "projects_rep_idx" ON "projects" USING btree ("representative_id");--> statement-breakpoint
CREATE INDEX "prospect_camp_tenant_idx" ON "prospect_campaigns" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prospect_cont_tenant_idx" ON "prospect_contacts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prospect_cont_phone_idx" ON "prospect_contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "prospect_logs_tenant_idx" ON "prospect_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prospect_logs_contact_idx" ON "prospect_logs" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "prospect_queue_tenant_idx" ON "prospect_queues" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "prospect_queue_status_idx" ON "prospect_queues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prospect_queue_sched_idx" ON "prospect_queues" USING btree ("scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rep_user_idx" ON "representatives" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rep_code_idx" ON "representatives" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_wa_msg_idx" ON "lead_conversations" USING btree ("wa_message_id");