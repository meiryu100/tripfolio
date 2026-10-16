ALTER TABLE "users" ADD COLUMN "facebook_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_facebook_id_unique" UNIQUE("facebook_id");