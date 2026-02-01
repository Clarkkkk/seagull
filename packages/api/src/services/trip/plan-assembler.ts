import type { Trip, TripDay, TripItem } from "@acme/db/schema";

export type TripPlanV2 = {
  trip: {
    id: string;
    title: string;
    destination: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    version: number;
  };
  days: Array<{
    id: string;
    date: string | null;
    dayIndex: number;
    items: Array<{
      id: string;
      type: string;
      order: number;
      title: string;
      startsMinute: number | null;
      endsMinute: number | null;
      note: string | null;
      lat: number | null;
      lng: number | null;
      jarId: string | null;
    }>;
  }>;
  unassignedItems: Array<{
    id: string;
    type: string;
    order: number;
    title: string;
    startsMinute: number | null;
    endsMinute: number | null;
    note: string | null;
    lat: number | null;
    lng: number | null;
    jarId: string | null;
  }>;
};

function dateToIsoDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

export function assembleTripPlanV2(args: {
  trip: typeof Trip.$inferSelect;
  days: Array<typeof TripDay.$inferSelect>;
  items: Array<typeof TripItem.$inferSelect>;
}): TripPlanV2 {
  const dayById = new Map<string, typeof TripDay.$inferSelect>();
  for (const d of args.days) dayById.set(d.id, d);

  const itemsByDayId = new Map<string, Array<typeof TripItem.$inferSelect>>();
  const unassigned: Array<typeof TripItem.$inferSelect> = [];

  for (const it of args.items) {
    if (it.dayId) {
      const arr = itemsByDayId.get(it.dayId) ?? [];
      arr.push(it);
      itemsByDayId.set(it.dayId, arr);
    } else {
      unassigned.push(it);
    }
  }

  const daysSorted = [...args.days].sort((a, b) => a.dayIndex - b.dayIndex);
  const planDays = daysSorted.map((d) => {
    const items = (itemsByDayId.get(d.id) ?? []).sort((a, b) => a.order - b.order);
    return {
      id: d.id,
      date: dateToIsoDate(d.date),
      dayIndex: d.dayIndex,
      items: items.map((it) => ({
        id: it.id,
        type: it.type,
        order: it.order,
        title: it.title,
        startsMinute: it.startsMinute ?? null,
        endsMinute: it.endsMinute ?? null,
        note: it.note ?? null,
        lat: it.lat ?? null,
        lng: it.lng ?? null,
        jarId: it.jarId ?? null,
      })),
    };
  });

  return {
    trip: {
      id: args.trip.id,
      title: args.trip.title,
      destination: args.trip.destination ?? null,
      status: args.trip.status,
      startDate: dateToIsoDate(args.trip.startDate),
      endDate: dateToIsoDate(args.trip.endDate),
      version: args.trip.version,
    },
    days: planDays,
    unassignedItems: unassigned
      .sort((a, b) => a.order - b.order)
      .map((it) => ({
        id: it.id,
        type: it.type,
        order: it.order,
        title: it.title,
        startsMinute: it.startsMinute ?? null,
        endsMinute: it.endsMinute ?? null,
        note: it.note ?? null,
        lat: it.lat ?? null,
        lng: it.lng ?? null,
        jarId: it.jarId ?? null,
      })),
  };
}

// Back-compat alias: existing callers may still import this name.
export const assembleTripPlanV1 = assembleTripPlanV2;
export type TripPlanV1 = TripPlanV2;

