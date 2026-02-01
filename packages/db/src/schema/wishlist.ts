import { index, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { Trip, WishlistJar } from "./entities";

export const WishlistJarTrip = pgTable(
  "wishlist_jar_trip",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    jarId: uuid("jar_id")
      .notNull()
      .references(() => WishlistJar.id, { onDelete: "cascade" }),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => Trip.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    jarIdUnique: uniqueIndex("wishlist_jar_trip_jar_id_unique").on(table.jarId),
    tripIdIdx: index("wishlist_jar_trip_trip_id_idx").on(table.tripId),
  }),
);

