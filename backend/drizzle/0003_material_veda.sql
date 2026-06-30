CREATE TYPE "public"."lesson_kind" AS ENUM('lesson', 'recitation');--> statement-breakpoint
CREATE TYPE "public"."lesson_source_kind" AS ENUM('link', 'image', 'pdf');--> statement-breakpoint
CREATE TABLE "lesson_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"institute_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_classes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lesson_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"sort" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"lesson_id" uuid NOT NULL,
	"kind" "lesson_source_kind" NOT NULL,
	"url" varchar(1000) NOT NULL,
	"description" varchar(300),
	"sort" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"institute_id" uuid NOT NULL,
	"kind" "lesson_kind" DEFAULT 'lesson' NOT NULL,
	"name" varchar(200),
	"description" text,
	"category_id" uuid,
	"date" date NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "lessons_visible_to_students" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_categories" ADD CONSTRAINT "lesson_categories_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_classes" ADD CONSTRAINT "lesson_classes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_classes" ADD CONSTRAINT "lesson_classes_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_classes" ADD CONSTRAINT "lesson_classes_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_sources" ADD CONSTRAINT "lesson_sources_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_category_id_lesson_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."lesson_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_lesson_per_class" ON "lesson_classes" USING btree ("lesson_id","class_id");