ALTER TABLE "users" ADD COLUMN "invited_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- The agents' read-only user (production only) may count invites.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agent_readonly') THEN
    GRANT SELECT ("invited_by") ON "users" TO agent_readonly;
  END IF;
END $$;
