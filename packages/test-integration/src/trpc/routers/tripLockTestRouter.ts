import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod/v4";

import {
  acquireTripLock,
  getTripLock,
  refreshTripLock,
  releaseTripLock,
} from "../../../../api/src/services/trip/lock-service";

export type TripLockTestContext = {
  db: any;
  userId: string | null;
  lockTtlMs: number;
};

const t = initTRPC.context<TripLockTestContext>().create({
  transformer: superjson,
});

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

export const tripLockTestRouter = t.router({
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
          return await acquireTripLock({
            db: ctx.db,
            tripId: input.tripId,
            userId: ctx.userId,
            ttlMs: ctx.lockTtlMs,
          });
        }),

      refresh: protectedProcedure
        .input(z.object({ tripId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          return await refreshTripLock({
            db: ctx.db,
            tripId: input.tripId,
            userId: ctx.userId,
            ttlMs: ctx.lockTtlMs,
          });
        }),

      release: protectedProcedure
        .input(z.object({ tripId: z.string() }))
        .mutation(async ({ ctx, input }) => {
          return await releaseTripLock({
            db: ctx.db,
            tripId: input.tripId,
            userId: ctx.userId,
          });
        }),
    }),
  }),
});

export type TripLockTestRouter = typeof tripLockTestRouter;

