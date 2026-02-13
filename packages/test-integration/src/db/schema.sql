-- GENERATED FILE (do not hand-edit)
-- Source: packages/db/src/schema.ts
-- Generated at: 2026-02-01T15:50:53.645Z

CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"destination" text,
	"status" text DEFAULT 'planning' NOT NULL,
	"start_date" date,
	"end_date" date,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wishlist_jar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"province" text NOT NULL,
	"city" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"formatted_address" text,
	"note" text,
	"link_url" text,
	"source_type" text DEFAULT 'map',
	"source_title" text,
	"source_raw_text" text,
	"place_provider" text DEFAULT 'mapbox',
	"place_id" text,
	"cover_image_id" uuid,
	"cover_image_url" text,
	"cover_image_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wishlist_jar_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jar_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"key" text NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip_collaborator" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_day" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"date" date,
	"day_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip_edit_lock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"locked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_id" uuid,
	"type" text NOT NULL,
	"order" integer NOT NULL,
	"title" text NOT NULL,
	"time_text" text,
	"starts_minute" integer,
	"ends_minute" integer,
	"note" text,
	"lat" double precision,
	"lng" double precision,
	"jar_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trip_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"data" jsonb NOT NULL,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "wishlist_jar_trip" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jar_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trip" ADD CONSTRAINT "trip_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_jar" ADD CONSTRAINT "wishlist_jar_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_jar_image" ADD CONSTRAINT "wishlist_jar_image_jar_id_wishlist_jar_id_fk" FOREIGN KEY ("jar_id") REFERENCES "public"."wishlist_jar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_jar_image" ADD CONSTRAINT "wishlist_jar_image_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_collaborator" ADD CONSTRAINT "trip_collaborator_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_collaborator" ADD CONSTRAINT "trip_collaborator_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_day" ADD CONSTRAINT "trip_day_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_edit_lock" ADD CONSTRAINT "trip_edit_lock_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_edit_lock" ADD CONSTRAINT "trip_edit_lock_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_item" ADD CONSTRAINT "trip_item_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_item" ADD CONSTRAINT "trip_item_day_id_trip_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."trip_day"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_item" ADD CONSTRAINT "trip_item_jar_id_wishlist_jar_id_fk" FOREIGN KEY ("jar_id") REFERENCES "public"."wishlist_jar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_snapshot" ADD CONSTRAINT "trip_snapshot_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_snapshot" ADD CONSTRAINT "trip_snapshot_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_jar_trip" ADD CONSTRAINT "wishlist_jar_trip_jar_id_wishlist_jar_id_fk" FOREIGN KEY ("jar_id") REFERENCES "public"."wishlist_jar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_jar_trip" ADD CONSTRAINT "wishlist_jar_trip_trip_id_trip_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trip"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trip_user_id_idx" ON "trip" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trip_status_idx" ON "trip" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trip_updated_at_idx" ON "trip" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "wishlist_jar_user_status_idx" ON "wishlist_jar" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "wishlist_jar_user_geo_idx" ON "wishlist_jar" USING btree ("user_id","country","province","city");--> statement-breakpoint
CREATE INDEX "wishlist_jar_user_place_idx" ON "wishlist_jar" USING btree ("user_id","place_provider","place_id");--> statement-breakpoint
CREATE INDEX "wishlist_jar_image_jar_id_idx" ON "wishlist_jar_image" USING btree ("jar_id");--> statement-breakpoint
CREATE INDEX "wishlist_jar_image_user_id_idx" ON "wishlist_jar_image" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wishlist_jar_image_created_at_idx" ON "wishlist_jar_image" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_collaborator_trip_user_unique" ON "trip_collaborator" USING btree ("trip_id","user_id");--> statement-breakpoint
CREATE INDEX "trip_collaborator_user_id_idx" ON "trip_collaborator" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trip_collaborator_trip_id_idx" ON "trip_collaborator" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_day_trip_day_index_unique" ON "trip_day" USING btree ("trip_id","day_index");--> statement-breakpoint
CREATE INDEX "trip_day_trip_id_idx" ON "trip_day" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_day_trip_date_idx" ON "trip_day" USING btree ("trip_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_edit_lock_trip_id_unique" ON "trip_edit_lock" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_edit_lock_expires_at_idx" ON "trip_edit_lock" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "trip_edit_lock_user_id_idx" ON "trip_edit_lock" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "trip_item_trip_id_idx" ON "trip_item" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "trip_item_day_id_idx" ON "trip_item" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "trip_item_jar_id_idx" ON "trip_item" USING btree ("jar_id");--> statement-breakpoint
CREATE INDEX "trip_item_trip_day_order_idx" ON "trip_item" USING btree ("trip_id","day_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_snapshot_trip_version_unique" ON "trip_snapshot" USING btree ("trip_id","version");--> statement-breakpoint
CREATE INDEX "trip_snapshot_trip_created_idx" ON "trip_snapshot" USING btree ("trip_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wishlist_jar_trip_jar_id_unique" ON "wishlist_jar_trip" USING btree ("jar_id");--> statement-breakpoint
CREATE INDEX "wishlist_jar_trip_trip_id_idx" ON "wishlist_jar_trip" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");