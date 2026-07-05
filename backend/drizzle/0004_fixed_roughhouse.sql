CREATE TYPE "public"."lesson_binding_status" AS ENUM('pending', 'started', 'finished', 'not_given', 'over_time', 'under_time');--> statement-breakpoint
CREATE TABLE "lesson_settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"institute_id" uuid NOT NULL,
	"duration_threshold_minutes" smallint DEFAULT 10 NOT NULL,
	"duration_status_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_settings_institute_id_unique" UNIQUE("institute_id")
);
--> statement-breakpoint
ALTER TABLE "lesson_classes" ADD COLUMN "status" "lesson_binding_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_classes" ADD COLUMN "actual_start_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lesson_classes" ADD COLUMN "actual_end_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "expected_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "lesson_settings" ADD CONSTRAINT "lesson_settings_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;