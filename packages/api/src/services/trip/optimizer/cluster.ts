import type { LatLng, OptimizeInput, TripItemForPlanning } from "./types";
import { haversineMeters, meanLatLng } from "./geo";
import { fixedMinutes, isFixedTime, validateNoOverlap } from "./schedule";

type Centroid = LatLng;

function itemPoint(item: TripItemForPlanning): LatLng | null {
  if (item.lat === null || item.lng === null) return null;
  return { lat: item.lat, lng: item.lng };
}

function initCentroids(args: {
  daysCount: number;
  dayIndexes: number[];
  items: TripItemForPlanning[];
  fixedByDay: Map<number, TripItemForPlanning[]>;
}): Centroid[] {
  const centroids: Array<Centroid | null> = args.dayIndexes.map((dayIndex) => {
    const fixed = args.fixedByDay.get(dayIndex) ?? [];
    const pts = fixed.map(itemPoint).filter(Boolean) as LatLng[];
    return meanLatLng(pts);
  });

  // fill remaining centroids from first available points (deterministic)
  for (const it of args.items) {
    const p = itemPoint(it);
    if (!p) continue;
    const idx = centroids.findIndex((c) => c === null);
    if (idx === -1) break;
    centroids[idx] = p;
  }

  // if still missing (e.g. all missing coords), just fallback to (0,0) placeholders
  for (let i = 0; i < centroids.length; i += 1) {
    if (centroids[i] === null) centroids[i] = { lat: 0, lng: 0 };
  }

  return centroids as Centroid[];
}

function assignToNearestCentroid(p: LatLng, centroids: Centroid[]): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < centroids.length; i += 1) {
    const d = haversineMeters(p, centroids[i]!);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function clusterAndAssignDays(input: OptimizeInput): {
  assigned: Map<number, TripItemForPlanning[]>;
  unassigned: Array<{ item: TripItemForPlanning; reason: string }>;
} {
  const daysCount = input.days.length;
  const dayIndexes = input.days.map((d) => d.dayIndex);
  const dayIdxByDayIndex = new Map<number, number>();
  for (let i = 0; i < dayIndexes.length; i += 1) dayIdxByDayIndex.set(dayIndexes[i]!, i);

  const fixedByDay = new Map<number, TripItemForPlanning[]>();
  for (const it of input.items) {
    if (it.dayIndex === null) continue;
    if (!isFixedTime(it)) continue;
    const arr = fixedByDay.get(it.dayIndex) ?? [];
    arr.push(it);
    fixedByDay.set(it.dayIndex, arr);
  }

  // Capacity per day in minutes (v1 approximation)
  const capacityByDay = new Map<number, number>();
  for (const d of input.days) {
    const fixed = fixedByDay.get(d.dayIndex) ?? [];
    const fixedUsed = fixed.reduce((sum, it) => sum + fixedMinutes(it), 0);
    capacityByDay.set(d.dayIndex, Math.max(0, (input.dayEndMinute - input.dayStartMinute) - fixedUsed));
  }

  const candidates = input.items.filter((it) => {
    if (isFixedTime(it)) return false; // fixed-time items are already placed
    if (input.scope === "onlyUnscheduled") return it.dayIndex === null;
    // all: allow moving non-fixed items
    return true;
  });

  const centroids = initCentroids({ daysCount, dayIndexes, items: candidates, fixedByDay });
  const assigned = new Map<number, TripItemForPlanning[]>();
  const unassigned: Array<{ item: TripItemForPlanning; reason: string }> = [];

  // seed assigned with fixed items
  for (const d of input.days) {
    assigned.set(d.dayIndex, (fixedByDay.get(d.dayIndex) ?? []).slice());
  }

  for (const it of candidates) {
    const p = itemPoint(it);
    if (!p) {
      unassigned.push({ item: it, reason: "missing_coordinates" });
      continue;
    }

    const preferred = assignToNearestCentroid(p, centroids);
    const dayIndexPreferred = input.days[preferred]?.dayIndex ?? 0;

    // try preferred day first, then others by distance
    const dayOrder = dayIndexes.slice().sort((a, b) => {
      const aIdx = dayIdxByDayIndex.get(a) ?? 0;
      const bIdx = dayIdxByDayIndex.get(b) ?? 0;
      return haversineMeters(p, centroids[aIdx]!) - haversineMeters(p, centroids[bIdx]!);
    });

    // ensure preferred is first
    const dedup = [dayIndexPreferred, ...dayOrder.filter((x) => x !== dayIndexPreferred)];

    let placed = false;
    for (const dayIndex of dedup) {
      const remaining = capacityByDay.get(dayIndex) ?? 0;
      if (remaining < input.defaultVisitMinutes) continue;
      const arr = assigned.get(dayIndex) ?? [];
      arr.push({ ...it, dayIndex });
      assigned.set(dayIndex, arr);
      capacityByDay.set(dayIndex, remaining - input.defaultVisitMinutes);
      placed = true;
      break;
    }

    if (!placed) {
      unassigned.push({ item: it, reason: "insufficient_free_time_capacity" });
    }
  }

  // basic sanity: fixed-time overlaps inside a day -> move conflicting non-fixed to unassigned (v1)
  for (const d of input.days) {
    const arr = assigned.get(d.dayIndex) ?? [];
    const fixedOnly = arr.filter(isFixedTime);
    const overlapCheck = validateNoOverlap(fixedOnly);
    if (overlapCheck.ok) continue;
    // Keep fixed items, but note: this indicates user data already invalid; optimizer won't fix.
    // We'll still proceed without changing them.
  }

  return { assigned, unassigned };
}

