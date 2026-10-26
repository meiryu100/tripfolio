ALTER TABLE "users" ADD COLUMN "signup_device" text;--> statement-breakpoint
-- Existing users: guess from the oldest session they still have (same rules as src/lib/device.ts).
-- Approximate: a session can be newer than the sign-up, and users with no session stay unknown (null).
UPDATE "users" u SET "signup_device" = CASE
    WHEN s.user_agent ~* 'ipad|tablet|kindle|silk|playbook' OR (s.user_agent ~* 'android' AND s.user_agent !~* 'mobile') THEN 'tablet'
    WHEN s.user_agent ~* 'mobi|iphone|ipod|android|windows phone' THEN 'mobile'
    ELSE 'desktop'
  END
FROM (SELECT DISTINCT ON ("user_id") "user_id", "user_agent" FROM "sessions" WHERE "user_agent" <> '' ORDER BY "user_id", "created_at") s
WHERE s.user_id = u.id AND u.signup_device IS NULL;
