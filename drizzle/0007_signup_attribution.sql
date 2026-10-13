ALTER TABLE "users" ADD COLUMN "signup_source" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_medium" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_campaign" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_referrer" text;--> statement-breakpoint
-- The analytics agent counts sign-ups per channel.
DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_readonly') THEN GRANT SELECT ("signup_source", "signup_medium", "signup_campaign", "signup_referrer") ON "users" TO agent_readonly; END IF; END $$;
