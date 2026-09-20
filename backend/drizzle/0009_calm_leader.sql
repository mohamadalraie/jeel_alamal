CREATE TYPE "public"."track_type" AS ENUM('regular', 'intensive');--> statement-breakpoint
CREATE TABLE "class_intensive_students" (
	"class_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_intensive_students_class_id_student_id_pk" PRIMARY KEY("class_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "user_institutes" (
	"user_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_institutes_user_id_institute_id_pk" PRIMARY KEY("user_id","institute_id")
);
--> statement-breakpoint
DROP INDEX "one_session_per_class_per_day";--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD COLUMN "track_type" "track_type" DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "class_schedule" ADD COLUMN "track_type" "track_type" DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_classes" ADD COLUMN "target_track" "track_type" DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE "class_intensive_students" ADD CONSTRAINT "class_intensive_students_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_intensive_students" ADD CONSTRAINT "class_intensive_students_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_institutes" ADD CONSTRAINT "user_institutes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_institutes" ADD CONSTRAINT "user_institutes_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_session_per_class_per_day_per_track" ON "attendance_sessions" USING btree ("class_id","date","track_type");