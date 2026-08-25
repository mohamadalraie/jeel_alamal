CREATE TYPE "public"."dinar_context" AS ENUM('lesson', 'recitation', 'attendance', 'general');--> statement-breakpoint
CREATE TYPE "public"."dinar_source_type" AS ENUM('manual_rule', 'exceptional', 'attendance', 'recitation');--> statement-breakpoint
CREATE TABLE "dinar_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"institute_id" uuid NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"context" "dinar_context" NOT NULL,
	"trigger" text NOT NULL,
	"system_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_protected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dinar_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"institute_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"context" "dinar_context" NOT NULL,
	"source_type" "dinar_source_type" NOT NULL,
	"rule_id" uuid,
	"rule_name" text,
	"reason" text,
	"source_ref" text,
	"awarded_by" uuid,
	"reverses_id" uuid,
	"reversed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dinar_rules" ADD CONSTRAINT "dinar_rules_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinar_transactions" ADD CONSTRAINT "dinar_transactions_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinar_transactions" ADD CONSTRAINT "dinar_transactions_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinar_transactions" ADD CONSTRAINT "dinar_transactions_rule_id_dinar_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."dinar_rules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinar_transactions" ADD CONSTRAINT "dinar_transactions_awarded_by_users_id_fk" FOREIGN KEY ("awarded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinar_transactions" ADD CONSTRAINT "dinar_transactions_reverses_id_dinar_transactions_id_fk" FOREIGN KEY ("reverses_id") REFERENCES "public"."dinar_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_system_rule_per_key_per_institute" ON "dinar_rules" USING btree ("institute_id","system_key") WHERE "dinar_rules"."system_key" is not null;--> statement-breakpoint
CREATE INDEX "dinar_rules_by_institute" ON "dinar_rules" USING btree ("institute_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_projection_per_source_student" ON "dinar_transactions" USING btree ("source_type","source_ref","student_id") WHERE "dinar_transactions"."source_ref" is not null;--> statement-breakpoint
CREATE INDEX "dinar_txn_by_student" ON "dinar_transactions" USING btree ("institute_id","student_id");--> statement-breakpoint
CREATE INDEX "dinar_txn_by_institute" ON "dinar_transactions" USING btree ("institute_id");