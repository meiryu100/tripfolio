ALTER TABLE "users" ADD COLUMN "is_test_user" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Mark accounts the seed script created before this column existed.
UPDATE "users" SET "is_test_user" = true WHERE "email" LIKE '%@example.com' OR "email" = 'demo@tripfolio.app';
