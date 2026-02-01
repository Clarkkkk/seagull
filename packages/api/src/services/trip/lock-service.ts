import { TRPCError } from "@trpc/server";

import { and, eq, lte, or } from "@acme/db";
import type { db as DbInstance } from "@acme/db/client";
import { TripEditLock } from "@acme/db/schema";

type Db = typeof DbInstance;

export interface TripLockInfo {
  tripId: string;
  userId: string;
  lockedAt: Date;
  expiresAt: Date;
  isExpired: boolean;
}

export function toTripLockInfo(row: typeof TripEditLock.$inferSelect): TripLockInfo {
  const now = new Date();
  const expiresAt = row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt as unknown as string);
  const lockedAt = row.lockedAt instanceof Date ? row.lockedAt : new Date(row.lockedAt as unknown as string);
  return {
    tripId: row.tripId,
    userId: row.userId,
    lockedAt,
    expiresAt,
    isExpired: expiresAt.getTime() <= now.getTime(),
  };
}

export async function getTripLock(db: Db, tripId: string): Promise<TripLockInfo | null> {
  const lock = await db.query.TripEditLock.findFirst({
    where: eq(TripEditLock.tripId, tripId),
  });
  return lock ? toTripLockInfo(lock) : null;
}

export async function acquireTripLock(args: {
  db: Db;
  tripId: string;
  userId: string;
  ttlMs: number;
}): Promise<TripLockInfo> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + args.ttlMs);

  const [result] = await args.db
    .insert(TripEditLock)
    .values({
      tripId: args.tripId,
      userId: args.userId,
      lockedAt: now,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: TripEditLock.tripId,
      set: {
        userId: args.userId,
        lockedAt: now,
        expiresAt,
      },
      // Only allow "steal" if expired, or "renew" if already owned by the same user.
      where: or(lte(TripEditLock.expiresAt, now), eq(TripEditLock.userId, args.userId)),
    })
    .returning();

  if (result) return toTripLockInfo(result);

  throw new TRPCError({
    code: "CONFLICT",
    message: "Trip is locked by another user",
  });
}

export async function refreshTripLock(args: {
  db: Db;
  tripId: string;
  userId: string;
  ttlMs: number;
}): Promise<TripLockInfo> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + args.ttlMs);

  const existing = await args.db.query.TripEditLock.findFirst({
    where: eq(TripEditLock.tripId, args.tripId),
  });
  if (!existing) {
    throw new TRPCError({ code: "CONFLICT", message: "No active lock" });
  }

  const info = toTripLockInfo(existing);
  if (info.isExpired || info.userId !== args.userId) {
    throw new TRPCError({ code: "CONFLICT", message: "Lock not owned" });
  }

  const [updated] = await args.db
    .update(TripEditLock)
    .set({ expiresAt })
    .where(and(eq(TripEditLock.tripId, args.tripId), eq(TripEditLock.userId, args.userId)))
    .returning();

  if (!updated) {
    // Defensive: in case the row disappeared between read and update.
    throw new TRPCError({ code: "CONFLICT", message: "Lock not owned" });
  }

  return toTripLockInfo(updated);
}

export async function releaseTripLock(args: {
  db: Db;
  tripId: string;
  userId: string;
}): Promise<{ success: true }> {
  await args.db
    .delete(TripEditLock)
    .where(and(eq(TripEditLock.tripId, args.tripId), eq(TripEditLock.userId, args.userId)));
  return { success: true as const };
}

export async function requireTripLockOwned(args: {
  db: Db;
  tripId: string;
  userId: string;
}): Promise<void> {
  const lock = await args.db.query.TripEditLock.findFirst({
    where: eq(TripEditLock.tripId, args.tripId),
  });
  if (!lock) throw new TRPCError({ code: "CONFLICT", message: "Trip is not locked" });

  const info = toTripLockInfo(lock);
  if (info.isExpired || info.userId !== args.userId) {
    throw new TRPCError({ code: "CONFLICT", message: "Trip is locked by another user" });
  }
}

