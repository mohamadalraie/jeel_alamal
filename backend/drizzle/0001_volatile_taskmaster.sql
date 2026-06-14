CREATE TYPE "public"."recitation_rating" AS ENUM('excellent', 'very_good', 'good', 'acceptable', 'weak');--> statement-breakpoint
CREATE TABLE "recitations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"surah_number" smallint NOT NULL,
	"from_ayah" smallint NOT NULL,
	"to_ayah" smallint NOT NULL,
	"rating" "recitation_rating" NOT NULL,
	"recited_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recitations" ADD CONSTRAINT "recitations_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recitations" ADD CONSTRAINT "recitations_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recitations" ADD CONSTRAINT "recitations_recited_by_users_id_fk" FOREIGN KEY ("recited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;