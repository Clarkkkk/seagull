import { sql } from "drizzle-orm";
import {
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../auth-schema";
import { Trip, WishlistJar } from "./entities";

export const TripCollaborator = pgTable(
  "trip_collaborator",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => Trip.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("editor"), // viewer | editor
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tripUserUnique: uniqueIndex("trip_collaborator_trip_user_unique").on(table.tripId, table.userId),
    userIdIdx: index("trip_collaborator_user_id_idx").on(table.userId),
    tripIdIdx: index("trip_collaborator_trip_id_idx").on(table.tripId),
  }),
);

export const TripDay = pgTable(
  "trip_day",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => Trip.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }),
    dayIndex: integer("day_index").notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).$onUpdateFn(() => new Date()),
  },
  (table) => ({
    tripDayIndexUnique: uniqueIndex("trip_day_trip_day_index_unique").on(table.tripId, table.dayIndex),
    tripIdIdx: index("trip_day_trip_id_idx").on(table.tripId),
    tripDateIdx: index("trip_day_trip_date_idx").on(table.tripId, table.date),
  }),
);

export const TripItem = pgTable(
  "trip_item",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => Trip.id, { onDelete: "cascade" }),
    dayId: uuid("day_id").references(() => TripDay.id, { onDelete: "set null" }),
    type: text("type").notNull(), // poi | transport | lodging | note | free
    order: integer("order").notNull(),
    title: text("title").notNull(),
    // Deprecated: kept temporarily to avoid interactive migrations.
    // v2 uses startsMinute/endsMinute.
    timeText: text("time_text"),
    startsMinute: integer("starts_minute"), // 0..1439 (nullable)
    endsMinute: integer("ends_minute"), // 1..1440 (nullable)
    note: text("note"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    jarId: uuid("jar_id").references(() => WishlistJar.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).$onUpdateFn(() => new Date()),
  },
  (table) => ({
    tripIdIdx: index("trip_item_trip_id_idx").on(table.tripId),
    dayIdIdx: index("trip_item_day_id_idx").on(table.dayId),
    jarIdIdx: index("trip_item_jar_id_idx").on(table.jarId),
    tripDayOrderIdx: index("trip_item_trip_day_order_idx").on(table.tripId, table.dayId, table.order),
  }),
);

export const TripEditLock = pgTable(
  "trip_edit_lock",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => Trip.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lockedAt: timestamp("locked_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => ({
    tripIdUnique: uniqueIndex("trip_edit_lock_trip_id_unique").on(table.tripId),
    expiresAtIdx: index("trip_edit_lock_expires_at_idx").on(table.expiresAt),
    userIdIdx: index("trip_edit_lock_user_id_idx").on(table.userId),
  }),
);

export const TripSnapshot = pgTable(
  "trip_snapshot",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => Trip.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    data: jsonb("data").notNull(),
    summary: text("summary"),
  },
  (table) => ({
    tripVersionUnique: uniqueIndex("trip_snapshot_trip_version_unique").on(table.tripId, table.version),
    tripCreatedIdx: index("trip_snapshot_trip_created_idx").on(table.tripId, table.createdAt),
  }),
);

