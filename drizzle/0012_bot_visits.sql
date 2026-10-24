CREATE TABLE "bot_visits" (
	"day" date NOT NULL,
	"bot" text NOT NULL,
	"path" text NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_visits_day_bot_path_pk" PRIMARY KEY("day","bot","path")
);
--> statement-breakpoint
CREATE INDEX "bot_visits_path_idx" ON "bot_visits" USING btree ("path");