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
ALTER TABLE "wishlist_jar" ADD COLUMN "cover_image_id" uuid;--> statement-breakpoint
ALTER TABLE "wishlist_jar" ADD COLUMN "cover_image_url" text;--> statement-breakpoint
ALTER TABLE "wishlist_jar" ADD COLUMN "cover_image_key" text;--> statement-breakpoint
ALTER TABLE "wishlist_jar_image" ADD CONSTRAINT "wishlist_jar_image_jar_id_wishlist_jar_id_fk" FOREIGN KEY ("jar_id") REFERENCES "public"."wishlist_jar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_jar_image" ADD CONSTRAINT "wishlist_jar_image_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wishlist_jar_image_jar_id_idx" ON "wishlist_jar_image" USING btree ("jar_id");--> statement-breakpoint
CREATE INDEX "wishlist_jar_image_user_id_idx" ON "wishlist_jar_image" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wishlist_jar_image_created_at_idx" ON "wishlist_jar_image" USING btree ("created_at");