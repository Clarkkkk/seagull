import { date, doublePrecision, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { user } from "../auth-schema";

export const TripStatusSchema = z.enum(["planning", "active", "completed", "archived"]);

export const Trip = pgTable(
  "trip",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    destination: text("destination"),
    status: text("status").notNull().default("planning"),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).$onUpdateFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("trip_user_id_idx").on(table.userId),
    statusIdx: index("trip_status_idx").on(table.status),
    updatedAtIdx: index("trip_updated_at_idx").on(table.updatedAt),
  }),
);

export const CreateTripSchema = createInsertSchema(Trip, {
  status: TripStatusSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const WishlistJar = pgTable(
  "wishlist_jar",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    status: text("status").notNull().default("inactive"), // inactive | in_trip | archived

    name: text("name").notNull(),

    country: text("country").notNull(),
    province: text("province").notNull(),
    city: text("city").notNull(),

    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),

    formattedAddress: text("formatted_address"),
    note: text("note"),
    linkUrl: text("link_url"),

    sourceType: text("source_type").default("map"), // map | link | share | manual
    sourceTitle: text("source_title"),
    sourceRawText: text("source_raw_text"),

    placeProvider: text("place_provider").default("mapbox"), // mapbox
    placeId: text("place_id"),

    coverImageId: uuid("cover_image_id"),
    coverImageUrl: text("cover_image_url"),
    coverImageKey: text("cover_image_key"),

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).$onUpdateFn(() => new Date()),
  },
  (table) => ({
    userStatusIdx: index("wishlist_jar_user_status_idx").on(table.userId, table.status),
    userCityIdx: index("wishlist_jar_user_geo_idx").on(
      table.userId,
      table.country,
      table.province,
      table.city,
    ),
    userPlaceIdx: index("wishlist_jar_user_place_idx").on(
      table.userId,
      table.placeProvider,
      table.placeId,
    ),
  }),
);

export const WishlistJarImage = pgTable(
  "wishlist_jar_image",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    jarId: uuid("jar_id")
      .notNull()
      .references(() => WishlistJar.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    key: text("key").notNull(),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => ({
    jarIdIdx: index("wishlist_jar_image_jar_id_idx").on(table.jarId),
    userIdIdx: index("wishlist_jar_image_user_id_idx").on(table.userId),
    createdAtIdx: index("wishlist_jar_image_created_at_idx").on(table.createdAt),
  }),
);

export const CreateWishlistJarSchema = createInsertSchema(WishlistJar, {
  status: z.enum(["inactive", "in_trip", "archived"]).optional(),
  sourceType: z.enum(["map", "link", "share", "manual"]).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

