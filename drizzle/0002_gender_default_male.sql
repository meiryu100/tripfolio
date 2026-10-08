-- Existing accounts without a gender default to male; new sign-ups must choose (validated in the API).
UPDATE "users" SET "gender" = 'male' WHERE "gender" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "gender" SET DEFAULT 'male';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "gender" SET NOT NULL;
