import type { TripItemForPlanning } from "./types";
import { detectOverlaps, getFreeSlots } from "../time-overlap";

export const DEFAULT_DAY_START = 0;
export const DEFAULT_DAY_END = 1440;

export function isFixedTime(item: TripItemForPlanning): boolean {
  return item.startsMinute !== null && item.endsMinute !== null;
}

export function fixedMinutes(item: TripItemForPlanning): number {
  if (item.startsMinute === null || item.endsMinute === null) return 0;
  return Math.max(0, item.endsMinute - item.startsMinute);
}

export function validateNoOverlap(items: TripItemForPlanning[]): { ok: true } | { ok: false; overlaps: any[] } {
  const overlaps = detectOverlaps(
    items.map((i) => ({ id: i.id, startsMinute: i.startsMinute, endsMinute: i.endsMinute })),
  );
  return overlaps.length ? { ok: false, overlaps } : { ok: true };
}

export function dayFreeSlots(items: TripItemForPlanning[], dayStartMinute = DEFAULT_DAY_START, dayEndMinute = DEFAULT_DAY_END) {
  return getFreeSlots({
    items: items.map((i) => ({ id: i.id, startsMinute: i.startsMinute, endsMinute: i.endsMinute })),
    dayStartMinute,
    dayEndMinute,
  });
}

