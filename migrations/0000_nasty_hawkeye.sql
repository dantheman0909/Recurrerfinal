CREATE TYPE "public"."account_health" AS ENUM('healthy', 'at_risk', 'red_zone');--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('starter', 'growth', 'key');--> statement-breakpoint
CREATE TYPE "public"."achievement_type" AS ENUM('tasks_completed', 'customer_health_improved', 'feedback_collected', 'playbooks_executed', 'red_zone_resolved', 'login_streak');--> statement-breakpoint
CREATE TYPE "public"."alert_severity" AS ENUM('critical', 'high_risk', 'attention_needed');--> statement-breakpoint
CREATE TYPE "public"."due_date_type" AS ENUM('fixed', 'relative');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'pending', 'error');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('task_assigned', 'task_due_soon', 'task_overdue', 'red_zone_alert', 'customer_renewal', 'system_notification', 'achievement_earned');--> statement-breakpoint
CREATE TYPE "public"."playbook_trigger" AS ENUM('manual', 'new_customer', 'usage_drop', 'renewal_approaching', 'custom_event');--> statement-breakpoint
CREATE TYPE "public"."recurrence_type" AS ENUM('none', 'daily', 'weekly', 'monthly', 'bi-weekly');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'team_lead', 'csm');--> statement-breakpoint
CREATE TABLE "chargebee_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"site" text NOT NULL,
	"apiKey" text NOT NULL,
	"status" "integration_status" DEFAULT 'active',
	"last_synced_at" timestamp,
	"sync_frequency" integer DEFAULT 24,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chargebee_field_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"chargebee_entity" text NOT NULL,
	"chargebee_field" text NOT NULL,
	"local_table" text NOT NULL,
	"local_field" text NOT NULL,
	"is_key_field" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"metric_type" text NOT NULL,
	"metric_value" integer,
	"metric_percent" integer,
	"recorded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"recurrer_id" text,
	"name" text NOT NULL,
	"industry" text,
	"logo_url" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"onboarded_at" timestamp,
	"renewal_date" timestamp,
	"mrr" integer,
	"arr" integer,
	"currency_code" text DEFAULT 'INR',
	"health_status" "account_health" DEFAULT 'healthy',
	"created_at" timestamp DEFAULT now(),
	"assigned_csm" integer,
	"chargebee_customer_id" text,
	"chargebee_subscription_id" text,
	"mysql_company_id" text,
	"active_stores" integer,
	"growth_subscription_count" integer,
	"loyalty_active_store_count" integer,
	"loyalty_inactive_store_count" integer,
	"loyalty_active_channels" text,
	"loyalty_channel_credits" integer,
	"negative_feedback_alert_inactive" integer,
	"less_than_300_bills" integer,
	"active_auto_campaigns_count" integer,
	"unique_customers_captured" integer,
	"revenue_1_year" integer,
	"customers_with_min_one_visit" integer,
	"customers_with_min_two_visit" integer,
	"customers_without_min_visits" integer,
	"percentage_of_inactive_customers" integer,
	"negative_feedbacks_count" integer,
	"campaigns_sent_last_90_days" integer,
	"bills_received_last_30_days" integer,
	"customers_acquired_last_30_days" integer,
	"loyalty_type" text,
	"loyalty_reward" text,
	"updated_from_mysql_at" timestamp,
	CONSTRAINT "customers_recurrer_id_unique" UNIQUE("recurrer_id")
);
--> statement-breakpoint
CREATE TABLE "mysql_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"host" text NOT NULL,
	"port" integer NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"database" text NOT NULL,
	"status" "integration_status" DEFAULT 'active',
	"last_synced_at" timestamp,
	"sync_frequency" integer DEFAULT 24,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mysql_field_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"mysql_table" text NOT NULL,
	"mysql_field" text NOT NULL,
	"local_table" text NOT NULL,
	"local_field" text NOT NULL,
	"field_type" text DEFAULT 'text',
	"is_key_field" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mysql_saved_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"query" text NOT NULL,
	"last_run_at" timestamp,
	"is_scheduled" boolean DEFAULT false,
	"schedule_frequency" integer DEFAULT 0,
	"enabled" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"related_id" integer,
	"related_type" text
);
--> statement-breakpoint
CREATE TABLE "playbook_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"playbook_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"triggered_by" integer,
	"trigger_event" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "playbook_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"playbook_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_type" "due_date_type" DEFAULT 'relative' NOT NULL,
	"due_offset" integer DEFAULT 0,
	"fixed_date" timestamp,
	"recurrence" "recurrence_type" DEFAULT 'none',
	"assignment_role" "user_role" DEFAULT 'csm',
	"required_fields" text[],
	"template_message" text,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "playbooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_type" "playbook_trigger" DEFAULT 'manual' NOT NULL,
	"target_segments" text[],
	"filters" jsonb,
	"active" boolean DEFAULT true,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "red_zone_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"reason" text NOT NULL,
	"severity" "alert_severity" DEFAULT 'attention_needed',
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'pending',
	"due_date" timestamp,
	"customer_id" integer,
	"assigned_to" integer,
	"recurring" boolean DEFAULT false,
	"recurrence_pattern" text,
	"playbook_id" integer,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"achievement_type" "achievement_type" NOT NULL,
	"achievement_title" text NOT NULL,
	"achievement_description" text NOT NULL,
	"badge_icon" text NOT NULL,
	"xp_earned" integer DEFAULT 0,
	"level_unlocked" integer,
	"earned_at" timestamp DEFAULT now(),
	"is_viewed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'csm' NOT NULL,
	"team_lead_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chargebee_config" ADD CONSTRAINT "chargebee_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargebee_field_mappings" ADD CONSTRAINT "chargebee_field_mappings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_metrics" ADD CONSTRAINT "customer_metrics_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_csm_users_id_fk" FOREIGN KEY ("assigned_csm") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mysql_config" ADD CONSTRAINT "mysql_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mysql_field_mappings" ADD CONSTRAINT "mysql_field_mappings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mysql_saved_queries" ADD CONSTRAINT "mysql_saved_queries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_runs" ADD CONSTRAINT "playbook_runs_playbook_id_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_runs" ADD CONSTRAINT "playbook_runs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_runs" ADD CONSTRAINT "playbook_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbook_tasks" ADD CONSTRAINT "playbook_tasks_playbook_id_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playbooks" ADD CONSTRAINT "playbooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "red_zone_alerts" ADD CONSTRAINT "red_zone_alerts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_playbook_id_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_lead_id_users_id_fk" FOREIGN KEY ("team_lead_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;