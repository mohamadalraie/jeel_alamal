ALTER TABLE "classes" ADD COLUMN "is_intensive" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "institutes" ADD COLUMN "intensive_track_enabled" boolean DEFAULT false NOT NULL;