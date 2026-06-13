CREATE TYPE "public"."study_degree" AS ENUM('secondary', 'diploma', 'bachelor', 'master', 'phd');--> statement-breakpoint
CREATE TYPE "public"."tajweed_level" AS ENUM('excellent', 'very_good', 'good', 'acceptable', 'weak');--> statement-breakpoint
CREATE TABLE "student_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"student_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_certifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"teacher_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "study_degree" "study_degree";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "study_field" varchar(150);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "quran_parts" smallint;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tajweed_level" "tajweed_level";--> statement-breakpoint
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_certifications" ADD CONSTRAINT "teacher_certifications_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;