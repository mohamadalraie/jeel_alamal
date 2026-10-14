CREATE TYPE "public"."lesson_report_webhook_status" AS ENUM('pending', 'sent', 'failed', 'disabled');--> statement-breakpoint
CREATE TABLE "lesson_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lesson_class_id" uuid NOT NULL,
	"main_ideas" text NOT NULL,
	"positives" text,
	"negatives" text,
	"teacher_notes" text,
	"submitted_by" uuid NOT NULL,
	"webhook_status" "lesson_report_webhook_status" DEFAULT 'pending' NOT NULL,
	"webhook_error" text,
	"webhook_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_reports_lesson_class_id_unique" UNIQUE("lesson_class_id")
);
--> statement-breakpoint
ALTER TABLE "lesson_settings" ADD COLUMN "webhook_url" varchar(500);--> statement-breakpoint
ALTER TABLE "lesson_settings" ADD COLUMN "webhook_secret" varchar(255);--> statement-breakpoint
ALTER TABLE "lesson_settings" ADD COLUMN "webhook_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_reports" ADD CONSTRAINT "lesson_reports_lesson_class_id_lesson_classes_id_fk" FOREIGN KEY ("lesson_class_id") REFERENCES "public"."lesson_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_reports" ADD CONSTRAINT "lesson_reports_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;