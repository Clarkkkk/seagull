import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, desc, eq } from "@acme/db";
import { Trip, TripCollaborator, TripDay, TripItem, TripSnapshot } from "@acme/db/schema";

import { protectedProcedure } from "../trpc";
import { assembleTripPlanV1 } from "../services/trip/plan-assembler";
import {
  acquireTripLock,
  getTripLock,
  refreshTripLock,
  releaseTripLock,
  requireTripLockOwned,
} from "../services/trip/lock-service";
import { createTripSnapshot } from "../services/trip/snapshot-service";
import { TripPlanSaveSchema, TripStatusSchema } from "../services/trip/validation";
import { detectOverlaps, getFreeSlots, rangeFitsInSlots } from "../services/trip/time-overlap";
import { optimizeTripPlan } from "../services/trip/optimizer";

const LOCK_TTL_MS = 60_000;

function parseIsoDateToDate(iso: string): Date {
  // `YYYY-MM-DD`
  return new Date(`${iso}T00:00:00.000Z`);
}

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const tripRouter = {
  list: protectedProcedure
    .input(
      z.object({
        status: TripStatusSchema.optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const owned = await ctx.db.query.Trip.findMany({
        where: (t, { and, eq, isNull }) => {
          const clauses = [eq(t.userId, userId), isNull(t.deletedAt)];
          if (input.status) clauses.push(eq(t.status, input.status));
          return and(...clauses);
        },
        orderBy: desc(Trip.updatedAt),
        limit: input.limit,
      });

      const collabTripIds = await ctx.db.query.TripCollaborator.findMany({
        where: (c, { eq }) => eq(c.userId, userId),
      });

      const collabTrips =
        collabTripIds.length > 0
          ? await ctx.db.query.Trip.findMany({
              where: (t, { and, eq, inArray, isNull }) => {
                const ids = collabTripIds.map((r) => r.tripId);
                const clauses: any[] = [inArray(t.id, ids), isNull(t.deletedAt)];
                if (input.status) clauses.push(eq(t.status, input.status));
                return and(...clauses);
              },
              orderBy: desc(Trip.updatedAt),
              limit: input.limit,
            })
          : [];

      const byId = new Map<string, (typeof Trip.$inferSelect) & { isOwner: boolean }>();
      for (const t of collabTrips) byId.set(t.id, { ...t, isOwner: t.userId === userId });
      for (const t of owned) byId.set(t.id, { ...t, isOwner: true });

      return [...byId.values()].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt as any).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt as any).getTime() : 0;
        return bTime - aTime;
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const trip = await ctx.db.query.Trip.findFirst({
        where: (t, { and, eq, isNull }) => and(eq(t.id, input.id), isNull(t.deletedAt)),
      });
      if (!trip) throw new TRPCError({ code: "NOT_FOUND" });

      const canAccess =
        trip.userId === userId ||
        (await ctx.db.query.TripCollaborator.findFirst({
          where: (c, { and, eq }) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
        }));
      if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });

      const days = await ctx.db.query.TripDay.findMany({
        where: (d, { eq }) => eq(d.tripId, trip.id),
      });
      const items = await ctx.db.query.TripItem.findMany({
        where: (it, { eq }) => eq(it.tripId, trip.id),
      });

      const lock = await getTripLock(ctx.db, trip.id);
      const plan = assembleTripPlanV1({ trip, days, items });

      return { trip, plan, lock };
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        destination: z.string().trim().min(1).max(200).optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [created] = await ctx.db
        .insert(Trip)
        .values({
          userId,
          title: input.title,
          destination: input.destination ?? null,
          status: "planning",
          startDate: input.startDate ?? null,
          endDate: input.endDate ?? null,
          version: 1,
          deletedAt: null,
        })
        .returning();
      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create trip" });
      }

      // Optional: seed days if dates provided
      if (input.startDate && input.endDate) {
        const start = parseIsoDateToDate(input.startDate);
        const end = parseIsoDateToDate(input.endDate);
        if (start <= end) {
          const days: Array<typeof TripDay.$inferInsert> = [];
          let cursor = new Date(start);
          let idx = 0;
          while (cursor <= end && idx < 366) {
            days.push({ tripId: created.id, date: formatIsoDate(cursor), dayIndex: idx });
            cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
            idx += 1;
          }
          if (days.length) await ctx.db.insert(TripDay).values(days);
        }
      }

      return created;
    }),

  updateMeta: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        destination: z.string().trim().min(1).max(200).optional().nullable(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
        status: TripStatusSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      if ((input.startDate === undefined) !== (input.endDate === undefined)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "startDate and endDate must be provided together",
        });
      }

      return ctx.db.transaction(async (tx: any) => {
        const trip = await tx.query.Trip.findFirst({
          where: (t: any, { and, eq, isNull }: any) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
        });
        if (!trip || trip.userId !== userId) throw new TRPCError({ code: "NOT_FOUND" });

        await requireTripLockOwned({ db: tx, tripId: trip.id, userId });

        const nextStart = input.startDate === undefined ? trip.startDate : input.startDate ?? null;
        const nextEnd = input.endDate === undefined ? trip.endDate : input.endDate ?? null;

        if (!!nextStart !== !!nextEnd) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "startDate and endDate must both be set or both be null",
          });
        }

        if (nextStart && nextEnd) {
          const s = parseIsoDateToDate(nextStart);
          const e = parseIsoDateToDate(nextEnd);
          if (s > e) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "startDate must be <= endDate" });
          }

          const days = Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1;
          if (days > 366) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "date range is too long (max 366 days)",
            });
          }
        }

        const [updated] = await tx
          .update(Trip)
          .set({
            title: input.title ?? trip.title,
            destination: input.destination === undefined ? trip.destination : input.destination ?? null,
            startDate: nextStart,
            endDate: nextEnd,
            status: input.status ?? trip.status,
          })
          .where(eq(Trip.id, trip.id))
          .returning();

        // Sync days with date range changes
        const hasRange = !!updated.startDate && !!updated.endDate;
        const existingDays = await tx.query.TripDay.findMany({
          where: (d: any, { eq }: any) => eq(d.tripId, trip.id),
        });
        const dayByIndex = new Map<number, (typeof TripDay.$inferSelect)>();
        for (const d of existingDays) dayByIndex.set(d.dayIndex, d);

        if (!hasRange) {
          // If range removed/partial: keep dayIndex but clear dates
          for (const d of existingDays) {
            if (d.date !== null) {
              await tx.update(TripDay).set({ date: null }).where(eq(TripDay.id, d.id));
            }
          }
          return updated;
        }

        const start = parseIsoDateToDate(updated.startDate as unknown as string);
        const end = parseIsoDateToDate(updated.endDate as unknown as string);
        const desired: Array<{ dayIndex: number; date: string }> = [];
        let cursor = new Date(start);
        let idx = 0;
        while (cursor <= end && idx < 366) {
          desired.push({ dayIndex: idx, date: formatIsoDate(cursor) });
          cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
          idx += 1;
        }

        const desiredIndexes = new Set(desired.map((d) => d.dayIndex));
        // Remove out-of-range days
        for (const d of existingDays) {
          if (!desiredIndexes.has(d.dayIndex)) {
            await tx.update(TripItem).set({ dayId: null }).where(eq(TripItem.dayId, d.id));
            await tx.delete(TripDay).where(eq(TripDay.id, d.id));
          }
        }

        // Upsert desired days with correct date
        for (const d of desired) {
          const existing = dayByIndex.get(d.dayIndex);
          if (existing) {
            await tx.update(TripDay).set({ date: d.date }).where(eq(TripDay.id, existing.id));
          } else {
            await tx.insert(TripDay).values({ tripId: trip.id, dayIndex: d.dayIndex, date: d.date });
          }
        }

        return updated;
      });
    }),

  lock: {
    get: protectedProcedure.input(z.object({ tripId: z.string().uuid() })).query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const trip = await ctx.db.query.Trip.findFirst({
        where: (t, { and, eq, isNull }) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
      });
      if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
      const canAccess =
        trip.userId === userId ||
        (await ctx.db.query.TripCollaborator.findFirst({
          where: (c, { and, eq }) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
        }));
      if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });
      return getTripLock(ctx.db, input.tripId);
    }),

    acquire: protectedProcedure
      .input(z.object({ tripId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const trip = await ctx.db.query.Trip.findFirst({
          where: (t, { and, eq, isNull }) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
        });
        if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
        const canAccess =
          trip.userId === userId ||
          (await ctx.db.query.TripCollaborator.findFirst({
            where: (c, { and, eq }) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
          }));
        if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });
        return acquireTripLock({ db: ctx.db, tripId: input.tripId, userId, ttlMs: LOCK_TTL_MS });
      }),

    refresh: protectedProcedure
      .input(z.object({ tripId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const trip = await ctx.db.query.Trip.findFirst({
          where: (t, { and, eq, isNull }) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
        });
        if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
        const canAccess =
          trip.userId === userId ||
          (await ctx.db.query.TripCollaborator.findFirst({
            where: (c, { and, eq }) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
          }));
        if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });
        return refreshTripLock({ db: ctx.db, tripId: input.tripId, userId, ttlMs: LOCK_TTL_MS });
      }),

    release: protectedProcedure
      .input(z.object({ tripId: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const trip = await ctx.db.query.Trip.findFirst({
          where: (t, { and, eq, isNull }) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
        });
        if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
        const canAccess =
          trip.userId === userId ||
          (await ctx.db.query.TripCollaborator.findFirst({
            where: (c, { and, eq }) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
          }));
        if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });
        return releaseTripLock({ db: ctx.db, tripId: input.tripId, userId });
      }),
  },

  plan: {
    save: protectedProcedure.input(TripPlanSaveSchema).mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const result = await ctx.db.transaction(async (tx: any) => {
        const trip = await tx.query.Trip.findFirst({
          where: (t: any, { and, eq, isNull }: any) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
        });
        if (!trip) throw new TRPCError({ code: "NOT_FOUND" });

        const canAccess =
          trip.userId === userId ||
          (await tx.query.TripCollaborator.findFirst({
            where: (c: any, { and, eq }: any) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
          }));
        if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });

        await requireTripLockOwned({ db: tx, tripId: trip.id, userId });

        // v2 strategy: upsert days/items by stable ids (full-save semantics)
        const existingDays = await tx.query.TripDay.findMany({
          where: (d: any, { eq }: any) => eq(d.tripId, trip.id),
        });
        const dayByIndex = new Map<number, (typeof TripDay.$inferSelect)>();
        for (const d of existingDays) dayByIndex.set(d.dayIndex, d);

        const inputDayIndexes = new Set(input.days.map((d) => d.dayIndex));
        // delete removed days (move their items to unassigned first)
        for (const d of existingDays) {
          if (!inputDayIndexes.has(d.dayIndex)) {
            await tx.update(TripItem).set({ dayId: null }).where(eq(TripItem.dayId, d.id));
            await tx.delete(TripDay).where(eq(TripDay.id, d.id));
          }
        }

        // upsert days
        const dayIdByIndex = new Map<number, string>();
        for (const d of input.days) {
          const existing = dayByIndex.get(d.dayIndex);
          if (existing) {
            const [updatedDay] = await tx
              .update(TripDay)
              .set({ date: d.date ?? null })
              .where(eq(TripDay.id, existing.id))
              .returning();
            dayIdByIndex.set(d.dayIndex, updatedDay.id);
          } else {
            const [createdDay] = await tx
              .insert(TripDay)
              .values({ tripId: trip.id, dayIndex: d.dayIndex, date: d.date ?? null })
              .returning();
            dayIdByIndex.set(d.dayIndex, createdDay.id);
          }
        }

        const existingItems = await tx.query.TripItem.findMany({
          where: (it: any, { eq }: any) => eq(it.tripId, trip.id),
        });
        const existingItemById = new Map<string, (typeof TripItem.$inferSelect)>();
        for (const it of existingItems) existingItemById.set(it.id, it);

        const keptItemIds = new Set<string>();
        for (const it of input.items) {
          const dayId =
            it.dayIndex === null || it.dayIndex === undefined ? null : dayIdByIndex.get(it.dayIndex) ?? null;
          if (it.id && existingItemById.has(it.id)) {
            const [updatedItem] = await tx
              .update(TripItem)
              .set({
                dayId,
                type: it.type,
                order: it.order,
                title: it.title,
                startsMinute: it.startsMinute ?? null,
                endsMinute: it.endsMinute ?? null,
                note: it.note ?? null,
                lat: it.lat ?? null,
                lng: it.lng ?? null,
                jarId: it.jarId ?? null,
              })
              .where(eq(TripItem.id, it.id))
              .returning();
            keptItemIds.add(updatedItem.id);
          } else {
            const [createdItem] = await tx
              .insert(TripItem)
              .values({
                tripId: trip.id,
                dayId,
                type: it.type,
                order: it.order,
                title: it.title,
                startsMinute: it.startsMinute ?? null,
                endsMinute: it.endsMinute ?? null,
                note: it.note ?? null,
                lat: it.lat ?? null,
                lng: it.lng ?? null,
                jarId: it.jarId ?? null,
              })
              .returning();
            keptItemIds.add(createdItem.id);
          }
        }

        // delete items not in input (full-save)
        const deleteIds = existingItems
          .map((x: { id: string }) => x.id)
          .filter((id: string) => !keptItemIds.has(id));
        for (const id of deleteIds) {
          await tx.delete(TripItem).where(eq(TripItem.id, id));
        }

        // conflict validation: no overlaps within same day
        const itemsAfterWrite = await tx.query.TripItem.findMany({
          where: (it: any, { eq }: any) => eq(it.tripId, trip.id),
        });
        const overlaps = new Map<string, ReturnType<typeof detectOverlaps>>();
        const byDay = new Map<string, Array<{ id: string; startsMinute: number | null; endsMinute: number | null }>>();
        for (const it of itemsAfterWrite) {
          if (!it.dayId) continue;
          const arr = byDay.get(it.dayId) ?? [];
          arr.push({ id: it.id, startsMinute: it.startsMinute ?? null, endsMinute: it.endsMinute ?? null });
          byDay.set(it.dayId, arr);
        }
        for (const [dayId, arr] of byDay.entries()) {
          const dayOverlaps = detectOverlaps(arr);
          if (dayOverlaps.length) overlaps.set(dayId, dayOverlaps);
        }
        if (overlaps.size) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Time ranges overlap within the same day",
            cause: { overlaps: Object.fromEntries(overlaps) },
          });
        }

        const nextVersion = (trip.version ?? 1) + 1;
        const [updatedTrip] = await tx
          .update(Trip)
          .set({ version: nextVersion })
          .where(eq(Trip.id, trip.id))
          .returning();

        const days = await tx.query.TripDay.findMany({
          where: (d: any, { eq }: any) => eq(d.tripId, trip.id),
        });
        const items = await tx.query.TripItem.findMany({
          where: (it: any, { eq }: any) => eq(it.tripId, trip.id),
        });
        const plan = assembleTripPlanV1({ trip: updatedTrip, days, items });

        await createTripSnapshot({ db: tx, tripId: trip.id, version: nextVersion, createdBy: userId, data: plan });

        return { trip: updatedTrip, plan };
      });

      return result;
    }),

    getFreeSlots: protectedProcedure
      .input(
        z.object({
          tripId: z.string().uuid(),
          dayIndex: z.number().int().min(0),
          excludeItemId: z.string().uuid().optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const trip = await ctx.db.query.Trip.findFirst({
          where: (t, { and, eq, isNull }) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
        });
        if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
        const canAccess =
          trip.userId === userId ||
          (await ctx.db.query.TripCollaborator.findFirst({
            where: (c, { and, eq }) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
          }));
        if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });

        const day = await ctx.db.query.TripDay.findFirst({
          where: (d, { and, eq }) => and(eq(d.tripId, trip.id), eq(d.dayIndex, input.dayIndex)),
        });
        if (!day) throw new TRPCError({ code: "NOT_FOUND", message: "Day not found" });

        const items = await ctx.db.query.TripItem.findMany({
          where: (it, { and, eq }) => and(eq(it.tripId, trip.id), eq(it.dayId, day.id)),
        });
        const filtered = input.excludeItemId ? items.filter((i) => i.id !== input.excludeItemId) : items;

        return getFreeSlots({
          items: filtered.map((i) => ({
            id: i.id,
            startsMinute: i.startsMinute ?? null,
            endsMinute: i.endsMinute ?? null,
          })),
        });
      }),

    reorderItems: protectedProcedure
      .input(
        z.object({
          tripId: z.string().uuid(),
          dayIndex: z.number().int().min(0),
          orderedItemIds: z.array(z.string().uuid()).min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const result = await ctx.db.transaction(async (tx: any) => {
          const trip = await tx.query.Trip.findFirst({
            where: (t: any, { and, eq, isNull }: any) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
          });
          if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
          const canAccess =
            trip.userId === userId ||
            (await tx.query.TripCollaborator.findFirst({
              where: (c: any, { and, eq }: any) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
            }));
          if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });

          await requireTripLockOwned({ db: tx, tripId: trip.id, userId });

          const day = await tx.query.TripDay.findFirst({
            where: (d: any, { and, eq }: any) => and(eq(d.tripId, trip.id), eq(d.dayIndex, input.dayIndex)),
          });
          if (!day) throw new TRPCError({ code: "NOT_FOUND", message: "Day not found" });

          const items = await tx.query.TripItem.findMany({
            where: (it: any, { and, eq }: any) => and(eq(it.tripId, trip.id), eq(it.dayId, day.id)),
          });
          const itemIdsInDay = new Set(items.map((i: any) => i.id));
          for (const id of input.orderedItemIds) {
            if (!itemIdsInDay.has(id)) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "orderedItemIds contains item not in day" });
            }
          }

          for (let idx = 0; idx < input.orderedItemIds.length; idx += 1) {
            const id = input.orderedItemIds[idx]!;
            await tx.update(TripItem).set({ order: idx }).where(eq(TripItem.id, id));
          }

          return { success: true as const };
        });

        return result;
      }),

    moveItem: protectedProcedure
      .input(
        z.object({
          tripId: z.string().uuid(),
          itemId: z.string().uuid(),
          targetDayIndex: z.number().int().min(0).nullable(),
          targetOrder: z.number().int().min(0).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        return ctx.db.transaction(async (tx: any) => {
          const trip = await tx.query.Trip.findFirst({
            where: (t: any, { and, eq, isNull }: any) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
          });
          if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
          const canAccess =
            trip.userId === userId ||
            (await tx.query.TripCollaborator.findFirst({
              where: (c: any, { and, eq }: any) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
            }));
          if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });

          await requireTripLockOwned({ db: tx, tripId: trip.id, userId });

          const item = await tx.query.TripItem.findFirst({
            where: (it: any, { and, eq }: any) => and(eq(it.tripId, trip.id), eq(it.id, input.itemId)),
          });
          if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });

          let targetDayId: string | null = null;
          if (input.targetDayIndex !== null) {
            const day = await tx.query.TripDay.findFirst({
              where: (d: any, { and, eq }: any) => and(eq(d.tripId, trip.id), eq(d.dayIndex, input.targetDayIndex)),
            });
            if (!day) throw new TRPCError({ code: "NOT_FOUND", message: "Target day not found" });
            targetDayId = day.id;
          }

          // If item has a fixed time range, ensure it fits in target day's free slots; otherwise move to unassigned.
          let placement: "day" | "unassigned" = targetDayId ? "day" : "unassigned";
          let reason: string | null = null;

          if (targetDayId && item.startsMinute !== null && item.endsMinute !== null) {
            const dayItems = await tx.query.TripItem.findMany({
              where: (it: any, { and, eq }: any) =>
                and(eq(it.tripId, trip.id), eq(it.dayId, targetDayId)),
            });
            const slots = getFreeSlots({
              items: dayItems.map((i: any) => ({
                id: i.id,
                startsMinute: i.startsMinute ?? null,
                endsMinute: i.endsMinute ?? null,
              })),
            });
            const fits = rangeFitsInSlots(
              { startsMinute: item.startsMinute, endsMinute: item.endsMinute },
              slots,
            );
            if (!fits) {
              placement = "unassigned";
              reason = "Target day does not have enough free time for this fixed time range";
              targetDayId = null;
            }
          }

          // compute order (v1): append to the end; can add insert-at-position later
          const siblings = await tx.query.TripItem.findMany({
            where: (it: any, { and, eq, isNull }: any) =>
              targetDayId
                ? and(eq(it.tripId, trip.id), eq(it.dayId, targetDayId))
                : and(eq(it.tripId, trip.id), isNull(it.dayId)),
          });
          const nextOrder = siblings.length;

          await tx
            .update(TripItem)
            .set({ dayId: targetDayId, order: nextOrder })
            .where(eq(TripItem.id, item.id));

          return { placement, reason };
        });
      }),

    optimize: protectedProcedure
      .input(
        z.object({
          tripId: z.string().uuid(),
          scope: z.enum(["onlyUnscheduled", "all"]).default("onlyUnscheduled"),
          daysCount: z.number().int().min(1).max(30).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;

        return ctx.db.transaction(async (tx: any) => {
          const trip = await tx.query.Trip.findFirst({
            where: (t: any, { and, eq, isNull }: any) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
          });
          if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
          const canAccess =
            trip.userId === userId ||
            (await tx.query.TripCollaborator.findFirst({
              where: (c: any, { and, eq }: any) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
            }));
          if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });

          await requireTripLockOwned({ db: tx, tripId: trip.id, userId });

          let days = await tx.query.TripDay.findMany({
            where: (d: any, { eq }: any) => eq(d.tripId, trip.id),
          });
          if (!days.length) {
            const n = input.daysCount ?? 0;
            if (!n) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "No days exist; provide daysCount or set date range" });
            }
            const inserts = Array.from({ length: n }).map((_, idx) => ({
              tripId: trip.id,
              dayIndex: idx,
              date: null,
            }));
            await tx.insert(TripDay).values(inserts);
            days = await tx.query.TripDay.findMany({ where: (d: any, { eq }: any) => eq(d.tripId, trip.id) });
          }

          const dayIdByIndex = new Map<number, string>();
          const indexByDayId = new Map<string, number>();
          for (const d of days) {
            dayIdByIndex.set(d.dayIndex, d.id);
            indexByDayId.set(d.id, d.dayIndex);
          }

          const items = await tx.query.TripItem.findMany({
            where: (it: any, { eq }: any) => eq(it.tripId, trip.id),
          });

          const result = await optimizeTripPlan({
            days: days.map((d: any) => ({ dayIndex: d.dayIndex })),
            items: items.map((it: any) => ({
              id: it.id,
              title: it.title,
              lat: it.lat ?? null,
              lng: it.lng ?? null,
              startsMinute: it.startsMinute ?? null,
              endsMinute: it.endsMinute ?? null,
              dayIndex: it.dayId ? (indexByDayId.get(it.dayId) ?? null) : null,
            })),
            scope: input.scope,
            defaultVisitMinutes: 90,
            dayStartMinute: 0,
            dayEndMinute: 1440,
          });

          // Apply day plans: update dayId + order
          const plannedById = new Set<string>();
          for (const dp of result.dayPlans) {
            const dayId = dayIdByIndex.get(dp.dayIndex);
            if (!dayId) continue;
            const dayItems = items.filter((it: any) => it.dayId === dayId);
            const plannedIds = dp.orderedItemIds.filter((id) => items.some((it: any) => it.id === id));
            const plannedSet = new Set(plannedIds);
            const rest = dayItems
              .filter((it: any) => !plannedSet.has(it.id))
              .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
              .map((it: any) => it.id);
            const finalIds = [...plannedIds, ...rest];

            for (let idx = 0; idx < finalIds.length; idx += 1) {
              const id = finalIds[idx]!;
              plannedById.add(id);
              await tx.update(TripItem).set({ dayId, order: idx }).where(eq(TripItem.id, id));
            }
          }

          // Apply unassigned moves
          const unassignedIds = new Set(result.unassigned.map((u) => u.itemId));
          if (unassignedIds.size) {
            const existingUnassigned = items.filter((it: any) => it.dayId === null).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
            let base = existingUnassigned.length;
            for (const id of unassignedIds) {
              await tx.update(TripItem).set({ dayId: null, order: base }).where(eq(TripItem.id, id));
              base += 1;
            }
          }

          const nextVersion = (trip.version ?? 1) + 1;
          const [updatedTrip] = await tx.update(Trip).set({ version: nextVersion }).where(eq(Trip.id, trip.id)).returning();
          const daysAfter = await tx.query.TripDay.findMany({ where: (d: any, { eq }: any) => eq(d.tripId, trip.id) });
          const itemsAfter = await tx.query.TripItem.findMany({ where: (it: any, { eq }: any) => eq(it.tripId, trip.id) });
          const plan = assembleTripPlanV1({ trip: updatedTrip, days: daysAfter, items: itemsAfter });

          await createTripSnapshot({ db: tx, tripId: trip.id, version: nextVersion, createdBy: userId, data: plan });

          return { plan, unassigned: result.unassigned };
        });
      }),
  },

  snapshots: {
    list: protectedProcedure
      .input(z.object({ tripId: z.string().uuid(), limit: z.number().int().min(1).max(50).default(20) }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const trip = await ctx.db.query.Trip.findFirst({
          where: (t, { and, eq, isNull }) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
        });
        if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
        const canAccess =
          trip.userId === userId ||
          (await ctx.db.query.TripCollaborator.findFirst({
            where: (c, { and, eq }) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
          }));
        if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });
        return ctx.db.query.TripSnapshot.findMany({
          where: (s, { eq }) => eq(s.tripId, input.tripId),
          orderBy: desc(TripSnapshot.createdAt),
          limit: input.limit,
        });
      }),

    get: protectedProcedure
      .input(z.object({ tripId: z.string().uuid(), version: z.number().int().min(1) }))
      .query(async ({ ctx, input }) => {
        const userId = ctx.session.user.id;
        const trip = await ctx.db.query.Trip.findFirst({
          where: (t, { and, eq, isNull }) => and(eq(t.id, input.tripId), isNull(t.deletedAt)),
        });
        if (!trip) throw new TRPCError({ code: "NOT_FOUND" });
        const canAccess =
          trip.userId === userId ||
          (await ctx.db.query.TripCollaborator.findFirst({
            where: (c, { and, eq }) => and(eq(c.tripId, trip.id), eq(c.userId, userId)),
          }));
        if (!canAccess) throw new TRPCError({ code: "NOT_FOUND" });
        const snap = await ctx.db.query.TripSnapshot.findFirst({
          where: (s, { and, eq }) => and(eq(s.tripId, input.tripId), eq(s.version, input.version)),
        });
        if (!snap) throw new TRPCError({ code: "NOT_FOUND" });
        return snap;
      }),
  },
} satisfies TRPCRouterRecord;

