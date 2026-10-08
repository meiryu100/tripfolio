CREATE TABLE "user_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"country_code" char(2) NOT NULL,
	"region_code" text NOT NULL,
	"status" "country_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_regions" ADD CONSTRAINT "user_regions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_regions" ADD CONSTRAINT "user_regions_country_code_countries_iso_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("iso_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_regions_user_region_idx" ON "user_regions" USING btree ("user_id","region_code");--> statement-breakpoint
CREATE INDEX "user_regions_user_country_idx" ON "user_regions" USING btree ("user_id","country_code");