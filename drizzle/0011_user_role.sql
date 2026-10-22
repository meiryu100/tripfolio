CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
-- The owner's account is the only admin; everyone else (and every new sign-up) stays "user".
UPDATE "users" SET "role" = 'admin' WHERE lower("email") = 'meiryu100@gmail.com';
