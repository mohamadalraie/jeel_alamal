CREATE TABLE IF NOT EXISTS "user_institutes" (
	"user_id" uuid NOT NULL,
	"institute_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_institutes_user_id_institute_id_pk" PRIMARY KEY("user_id","institute_id")
);
--> statement-breakpoint
ALTER TABLE "user_institutes" ADD CONSTRAINT "user_institutes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_institutes" ADD CONSTRAINT "user_institutes_institute_id_institutes_id_fk" FOREIGN KEY ("institute_id") REFERENCES "public"."institutes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Backfill: every existing user that already has a home institute_id in the users table
-- should also have a row in user_institutes so the multi-membership query finds them.
INSERT INTO "user_institutes" ("user_id", "institute_id", "joined_at")
SELECT u.id, u.institute_id, COALESCE(u.created_at, now())
FROM "users" u
WHERE u.institute_id IS NOT NULL
  AND u.deleted_at IS NULL
ON CONFLICT DO NOTHING;
