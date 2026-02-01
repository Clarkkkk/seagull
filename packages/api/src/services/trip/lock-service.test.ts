import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it, vi } from "vitest";

import * as schema from "@acme/db/schema";

import { acquireTripLock, getTripLock, refreshTripLock, requireTripLockOwned } from "./lock-service";

async function createLockTestDb() {
  const client = new PGlite();
  await client.exec(`
    CREATE TABLE IF NOT EXISTS trip_edit_lock (
      id uuid PRIMARY KEY DEFAULT (md5(random()::text || clock_timestamp()::text))::uuid,
      trip_id uuid NOT NULL,
      user_id text NOT NULL,
      locked_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS trip_edit_lock_trip_id_unique ON trip_edit_lock (trip_id);
  `);

  const db = drizzle(client, { schema });
  return { client, db };
}

describe("trip/lock-service", () => {
  it("acquire：首次获取成功；其他用户冲突；过期后可被抢占；同一用户可续期", async () => {
    const { client, db } = await createLockTestDb();
    await client.exec(`TRUNCATE TABLE trip_edit_lock;`);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const tripId = "00000000-0000-0000-0000-000000000001";
    const userA = "user_a";
    const userB = "user_b";

    const first = await acquireTripLock({ db: db as any, tripId, userId: userA, ttlMs: 60_000 });
    expect(first.tripId).toBe(tripId);
    expect(first.userId).toBe(userA);
    expect(first.isExpired).toBe(false);

    await expect(acquireTripLock({ db: db as any, tripId, userId: userB, ttlMs: 60_000 })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    // 过期后允许抢占
    await client.exec(`UPDATE trip_edit_lock SET expires_at = now() - interval '1 second' WHERE trip_id = '${tripId}';`);
    const stolen = await acquireTripLock({ db: db as any, tripId, userId: userB, ttlMs: 60_000 });
    expect(stolen.userId).toBe(userB);

    // 同一用户允许续期（保证 expiresAt 变大）
    const before = stolen.expiresAt.getTime();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.010Z"));
    const renewed = await acquireTripLock({ db: db as any, tripId, userId: userB, ttlMs: 120_000 });
    expect(renewed.userId).toBe(userB);
    expect(renewed.expiresAt.getTime()).toBeGreaterThan(before);

    vi.useRealTimers();
  });

  it("refresh：无锁/非 owner/过期 均冲突；owner 正常刷新", async () => {
    const { client, db } = await createLockTestDb();
    await client.exec(`TRUNCATE TABLE trip_edit_lock;`);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const tripId = "00000000-0000-0000-0000-000000000002";
    const userA = "user_a";
    const userB = "user_b";

    await expect(refreshTripLock({ db: db as any, tripId, userId: userA, ttlMs: 60_000 })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await acquireTripLock({ db: db as any, tripId, userId: userA, ttlMs: 60_000 });

    await expect(refreshTripLock({ db: db as any, tripId, userId: userB, ttlMs: 60_000 })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    // 让锁过期后，owner 也不能 refresh（必须重新 acquire）
    await client.exec(`UPDATE trip_edit_lock SET expires_at = now() - interval '1 second' WHERE trip_id = '${tripId}';`);
    await expect(refreshTripLock({ db: db as any, tripId, userId: userA, ttlMs: 60_000 })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    // 重新 acquire，再 refresh 成功
    await acquireTripLock({ db: db as any, tripId, userId: userA, ttlMs: 60_000 });
    const before = (await getTripLock(db as any, tripId))!.expiresAt.getTime();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.020Z"));
    const refreshed = await refreshTripLock({ db: db as any, tripId, userId: userA, ttlMs: 120_000 });
    expect(refreshed.userId).toBe(userA);
    expect(refreshed.expiresAt.getTime()).toBeGreaterThan(before);

    vi.useRealTimers();
  });

  it("requireTripLockOwned：无锁/过期/非 owner 均抛 CONFLICT；owner+未过期 ok", async () => {
    const { client, db } = await createLockTestDb();
    await client.exec(`TRUNCATE TABLE trip_edit_lock;`);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const tripId = "00000000-0000-0000-0000-000000000003";
    const userA = "user_a";
    const userB = "user_b";

    await expect(requireTripLockOwned({ db: db as any, tripId, userId: userA })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await acquireTripLock({ db: db as any, tripId, userId: userA, ttlMs: 60_000 });
    await expect(requireTripLockOwned({ db: db as any, tripId, userId: userB })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await client.exec(`UPDATE trip_edit_lock SET expires_at = now() - interval '1 second' WHERE trip_id = '${tripId}';`);
    await expect(requireTripLockOwned({ db: db as any, tripId, userId: userA })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    await acquireTripLock({ db: db as any, tripId, userId: userA, ttlMs: 60_000 });
    await expect(requireTripLockOwned({ db: db as any, tripId, userId: userA })).resolves.toBeUndefined();

    vi.useRealTimers();
  });
});

