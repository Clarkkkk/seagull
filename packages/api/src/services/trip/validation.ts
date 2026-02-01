import { z } from "zod/v4";

export const TripStatusSchema = z.enum(["planning", "active", "completed", "archived"]);
export const TripItemTypeSchema = z.enum(["poi", "transport", "lodging", "note", "free"]);

export const TripIdInputSchema = z.object({ tripId: z.string().uuid() });

export const TripDayInputSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  dayIndex: z.number().int().min(0),
});

export const TripItemInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    dayIndex: z.number().int().min(0).nullable().optional(), // null/undefined => unassigned
    type: TripItemTypeSchema,
    order: z.number().int().min(0),
    title: z.string().trim().min(1).max(200),
    startsMinute: z.number().int().min(0).max(1439).optional().nullable(),
    endsMinute: z.number().int().min(1).max(1440).optional().nullable(),
    note: z.string().max(5000).optional().nullable(),
    lat: z.number().min(-90).max(90).optional().nullable(),
    lng: z.number().min(-180).max(180).optional().nullable(),
    jarId: z.string().uuid().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    const s = val.startsMinute ?? null;
    const e = val.endsMinute ?? null;
    const bothNull = s === null && e === null;
    const bothSet = s !== null && e !== null;
    if (!bothNull && !bothSet) {
      ctx.addIssue({
        code: "custom",
        message: "startsMinute and endsMinute must both be null or both be set",
      });
      return;
    }
    if (bothSet && s >= e) {
      ctx.addIssue({ code: "custom", message: "startsMinute must be < endsMinute" });
    }
  });

export const TripPlanSaveSchema = z.object({
  tripId: z.string().uuid(),
  days: z.array(TripDayInputSchema).default([]),
  items: z.array(TripItemInputSchema).default([]),
});

