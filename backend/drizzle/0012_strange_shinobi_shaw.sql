ALTER TABLE "class_schedule" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "class_schedule" ADD COLUMN "teacher_id" uuid;--> statement-breakpoint
ALTER TABLE "class_schedule" ADD CONSTRAINT "class_schedule_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;