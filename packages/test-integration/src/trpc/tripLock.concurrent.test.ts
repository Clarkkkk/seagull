import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createPgliteTestDb } from "../db/pglite";
import { setTestFetch } from "../test/setup";
import { makeInMemoryTrpcFetch } from "./inMemoryFetch";
import { tripLockTestRouter, type TripLockTestRouter } from "./routers/tripLockTestRouter";
import { seedTrip, seedUser } from "./api/seed";

describe("trip.lock acquire concurrency (50 callers)", () => {
  const ttlMs = 60_000;

  let dbHarness: Awaited<ReturnType<typeof createPgliteTestDb>>;

  const makeClient = (userId: string) =>
    createTRPCClient<TripLockTestRouter>({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: "http://test.local/api/trpc",
          fetch: globalThis.fetch as any,
          headers: () => ({
            "x-test-user-id": userId,
          }),
        }),
      ],
    });

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
  });

  beforeEach(async () => {
    await dbHarness.resetDb();
  });

  it("when 50 users attempt to acquire the same lock, exactly one succeeds and the rest CONFLICT", async () => {
    const tripId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const userIds = Array.from({ length: 50 }, (_, i) => `user_${i}`);
    await Promise.all(userIds.map((id) => seedUser({ client: dbHarness.client, id })));
    await seedTrip({ client: dbHarness.client, id: tripId, userId: userIds[0]!, title: "T" });

    const results = await Promise.allSettled(
      userIds.map(async (userId) => {
        const client = makeClient(userId);
        return await client.trip.lock.acquire.mutate({ tripId });
      }),
    );

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(49);

    for (const r of rejected) {
      const err = r.reason;
      expect(err).toBeInstanceOf(TRPCClientError);
      expect((err as TRPCClientError<any>).data?.code).toBe("CONFLICT");
    }
  });
});

