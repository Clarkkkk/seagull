import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createPgliteTestDb } from "../db/pglite";
import { setTestFetch } from "../test/setup";
import { makeInMemoryTrpcFetch } from "./inMemoryFetch";
import { tripLockTestRouter, type TripLockTestRouter } from "./routers/tripLockTestRouter";
import { seedTrip } from "./api/seed";

describe("trip.lock expiry semantics (in-memory fetch + PGlite)", () => {
  const ttlMs = 1_000;
  const userA = "userA";

  let client: ReturnType<typeof createTRPCClient<TripLockTestRouter>>;
  let dbHarness: Awaited<ReturnType<typeof createPgliteTestDb>>;

  beforeAll(async () => {
    dbHarness = await createPgliteTestDb();

    const handlerFetch = makeInMemoryTrpcFetch({
      router: tripLockTestRouter,
      createContext: ({ headers }) => ({
        db: dbHarness.db,
        userId: headers.get("x-test-user-id"),
        lockTtlMs: ttlMs,
      }),
    });

    setTestFetch(handlerFetch);

    client = createTRPCClient<TripLockTestRouter>({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: "http://test.local/api/trpc",
          fetch: globalThis.fetch as any,
          headers: () => ({
            "x-test-user-id": userA,
          }),
        }),
      ],
    });
  });

  beforeEach(async () => {
    await dbHarness.resetDb();
  });

  it("should become expired if refresh is missed, and refresh should throw CONFLICT", async () => {
    const tripId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    await seedTrip({ client: dbHarness.client, id: tripId, userId: userA, title: "T" });

    const acquired = await client.trip.lock.acquire.mutate({ tripId });
    expect(acquired.userId).toBe(userA);
    expect(acquired.isExpired).toBe(false);

    // Simulate missing the heartbeat by forcing the lock to be expired in DB.
    await dbHarness.client.exec(`
      UPDATE trip_edit_lock
      SET expires_at = now() - INTERVAL '1 second'
      WHERE trip_id = '${tripId}';
    `);

    const lockNow = await client.trip.lock.get.query({ tripId });
    expect(lockNow?.isExpired).toBe(true);

    try {
      await client.trip.lock.refresh.mutate({ tripId });
      throw new Error("expected refresh to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCClientError);
      expect((err as TRPCClientError<any>).data?.code).toBe("CONFLICT");
    }
  });
});

