CREATE TYPE "public"."weekday" AS ENUM('sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri');--> statement-breakpoint
CREATE TABLE "class_schedule" (
	"id" uuid PRIMARY KEY NOT NULL,
	"class_id" uuid NOT NULL,
	"day_of_week" "weekday" NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_schedule" ADD CONSTRAINT "class_schedule_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;