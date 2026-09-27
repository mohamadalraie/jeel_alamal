CREATE TABLE "lesson_subjects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"institute_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"color" varchar(20),
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_schedule" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "class_schedule" ADD COLUMN "expected_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "class_schedule" ADD COLUMN "sort" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "subject_id" uuid;--> statement-breakpoint
ALTER TABLE "lesson_subjects" ADD CONSTRAINT "lesson_subjects_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_schedule" ADD CONSTRAINT "class_schedule_subject_id_lesson_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."lesson_subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_subject_id_lesson_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."lesson_subjects"("id") ON DELETE set null ON UPDATE no action;