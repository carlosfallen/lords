CREATE TABLE "city_presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cidade" varchar(100) NOT NULL,
	"link" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "city_presentations_cidade_unique" UNIQUE("cidade")
);
--> statement-breakpoint
CREATE TABLE "delete_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"representante_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"status" varchar(30) DEFAULT 'pendente' NOT NULL,
	"decided_at" timestamp,
	"decided_by_admin_id" uuid,
	"admin_motivo" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"canal" varchar(30) NOT NULL,
	"resultado" varchar(50) NOT NULL,
	"observacao" text,
	"contacted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"created_by_admin_id" uuid NOT NULL,
	"tipo" varchar(10) NOT NULL,
	"arquivo_pdf_url" text,
	"url" text,
	"status_proposta" varchar(50),
	"observacao_admin" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_adjustment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"representante_id" uuid NOT NULL,
	"mensagem" text NOT NULL,
	"status" varchar(30) DEFAULT 'pendente' NOT NULL,
	"admin_response" text,
	"responded_at" timestamp,
	"responded_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospect_queues" DROP CONSTRAINT "prospect_queues_contact_id_prospect_contacts_id_fk";
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'ativo';--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "field_name" varchar(100);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "old_value" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "new_value" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "justification" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "cidade" varchar(100);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "observacao_inicial" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "motivo_perda_texto" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "snooze_until" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "snooze_motivo" text;--> statement-breakpoint
ALTER TABLE "city_presentations" ADD CONSTRAINT "city_presentations_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delete_requests" ADD CONSTRAINT "delete_requests_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delete_requests" ADD CONSTRAINT "delete_requests_representante_id_users_id_fk" FOREIGN KEY ("representante_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delete_requests" ADD CONSTRAINT "delete_requests_decided_by_admin_id_users_id_fk" FOREIGN KEY ("decided_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_proposals" ADD CONSTRAINT "lead_proposals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_proposals" ADD CONSTRAINT "lead_proposals_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_adjustment_requests" ADD CONSTRAINT "proposal_adjustment_requests_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_adjustment_requests" ADD CONSTRAINT "proposal_adjustment_requests_representante_id_users_id_fk" FOREIGN KEY ("representante_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_adjustment_requests" ADD CONSTRAINT "proposal_adjustment_requests_responded_by_admin_id_users_id_fk" FOREIGN KEY ("responded_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delete_req_lead_idx" ON "delete_requests" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "delete_req_status_idx" ON "delete_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lead_activities_lead_idx" ON "lead_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_activities_user_idx" ON "lead_activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lead_activities_contacted_idx" ON "lead_activities" USING btree ("contacted_at");--> statement-breakpoint
CREATE INDEX "lead_notes_lead_idx" ON "lead_notes" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "lead_proposals_lead_idx" ON "lead_proposals" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "prop_adj_lead_idx" ON "proposal_adjustment_requests" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "prop_adj_status_idx" ON "proposal_adjustment_requests" USING btree ("status");--> statement-breakpoint
ALTER TABLE "prospect_queues" ADD CONSTRAINT "prospect_queues_contact_id_leads_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_updated_tenant_idx" ON "leads" USING btree ("tenant_id","updated_at");--> statement-breakpoint
CREATE INDEX "leads_not_converted_idx" ON "leads" USING btree ("is_converted") WHERE "leads"."is_converted" IS FALSE;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_phone_tenant_unique_idx" ON "leads" USING btree ("phone","tenant_id");