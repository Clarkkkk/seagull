import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import { createPgliteTestDb } from "../db/pglite";
import { setTestFetch } from "../test/setup";
import { makeInMemoryTrpcFetch } from "../trpc/inMemoryFetch";
import { seedTrip, seedUser } from "../trpc/api/seed";

import {
  acquireTripLock,
  getTripLock,
  refreshTripLock,
  releaseTripLock,
} from "../../../api/src/services/trip/lock-service";

vi.mock("~/utils/api", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  const { createTRPCClient, httpBatchLink } = await import("@trpc/client");
  const { createTRPCOptionsProxy } = await import("@trpc/tanstack-react-query");
  const superjson = (await import("superjson")).default;

  const queryClient = new QueryClient();
  const trpc = createTRPCOptionsProxy({
    client: createTRPCClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: "http://test.local/api/trpc",
          fetch: globalThis.fetch as any,
        }),
      ],
    }),
    queryClient,
  });

  return { queryClient, trpc };
});

import { useTripEditStore } from "~/business/trip/edit/store";
import { useTripEditLockEffect } from "~/business/trip/edit/locks/effect";
import { queryClient } from "~/utils/api";

describe("useTripEditLockEffect (Expo business) - refresh interval + unmount release", () => {
  const lockTtlMs = 120_000;

  let currentUserId: string | null = null;
  let dbHarness: Awaited<ReturnType<typeof createPgliteTestDb>>;
  const serverCalls = { acquire: 0, refresh: 0, release: 0 };

  beforeAll(async () => {
    dbHarness = await createPgliteTestDb();

    const t = initTRPC.context<{ db: any; userId: string | null; lockTtlMs: number }>().create({
      transformer: superjson,
    });

    const protectedProcedure = t.procedure.use(({ ctx, next }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      return next();
    });

    const router = t.router({
      trip: t.router({
        lock: t.router({
          get: protectedProcedure
            .input(z.object({ tripId: z.string() }))
            .query(async ({ ctx, input }) => {
              return await getTripLock(ctx.db, input.tripId);
            }),
          acquire: protectedProcedure
            .input(z.object({ tripId: z.string() }))
            .mutation(async ({ ctx, input }) => {
              serverCalls.acquire += 1;
              return await acquireTripLock({
                db: ctx.db,
                tripId: input.tripId,
                userId: ctx.userId!,
                ttlMs: ctx.lockTtlMs,
              });
            }),
          refresh: protectedProcedure
            .input(z.object({ tripId: z.string() }))
            .mutation(async ({ ctx, input }) => {
              serverCalls.refresh += 1;
              return await refreshTripLock({
                db: ctx.db,
                tripId: input.tripId,
                userId: ctx.userId!,
                ttlMs: ctx.lockTtlMs,
              });
            }),
          release: protectedProcedure
            .input(z.object({ tripId: z.string() }))
            .mutation(async ({ ctx, input }) => {
              serverCalls.release += 1;
              return await releaseTripLock({
                db: ctx.db,
                tripId: input.tripId,
                userId: ctx.userId!,
              });
            }),
        }),
      }),
    });

    const baseFetch = makeInMemoryTrpcFetch({
      router,
      createContext: () => ({
        db: dbHarness.db,
        userId: currentUserId,
        lockTtlMs,
      }),
    });

    setTestFetch(baseFetch);
  });

  beforeEach(async () => {
    await dbHarness.resetDb();
    queryClient.clear();

    currentUserId = "userA";
    serverCalls.acquire = 0;
    serverCalls.refresh = 0;
    serverCalls.release = 0;

    useTripEditStore.setState({
      tripId: null,
      errorMessage: null,
      hasLock: false,
      canEdit: false,
      days: [],
      items: [],
      selectedDayIndex: null,
      metaStartDate: "",
      metaEndDate: "",
      timeModalItemId: null,
      showJarPicker: false,
      persistedDayIndexes: [],
      nextLocalKey: 1,
    });
  });

  it("sends refresh on a 30s interval while owner", async () => {
    const tripId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

    vi.useFakeTimers();

    // Seed server state: in the real app, `lockInfo` comes from the server, so refresh should succeed.
    await seedUser({ client: dbHarness.client, id: "userA" });
    await seedTrip({ client: dbHarness.client, id: tripId, userId: "userA", title: "T" });
    await dbHarness.client.exec(`
      INSERT INTO trip_edit_lock (trip_id, user_id, locked_at, expires_at)
      VALUES ('${tripId}', 'userA', now(), now() + INTERVAL '120 seconds');
    `);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const lockInfo = {
      tripId,
      userId: "userA",
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + lockTtlMs),
      isExpired: false,
    };

    renderHook(
      (props: { tripId: string | null; lockInfo: any }) =>
        useTripEditLockEffect({
          tripId: props.tripId,
          isAuthed: true,
          userId: "userA",
          lockInfo: props.lockInfo,
        }),
      {
        wrapper,
        initialProps: { tripId, lockInfo },
      },
    );

    // Ensure derived ownership propagated into the store (avoid waitFor + fake timers interaction).
    await act(async () => {
      await Promise.resolve();
    });
    expect(useTripEditStore.getState().hasLock).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    vi.useRealTimers();

    expect(serverCalls.refresh).toBeGreaterThanOrEqual(1);
  });
});

