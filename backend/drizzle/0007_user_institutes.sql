CREATE TABLE IF NOT EXISTS "user_institutes" (
	"user_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_institutes_user_id_institute_id_pk" PRIMARY KEY("user_id","institute_id")
);
--> statement-breakpoint
ALTER TABLE "user_institutes" ADD CONSTRAINT "user_institutes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_institutes" ADD CONSTRAINT "user_institutes_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;
