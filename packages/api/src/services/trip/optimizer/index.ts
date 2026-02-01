import type { OptimizeInput, OptimizeResult, TripItemForPlanning } from "./types";
import { clusterAndAssignDays } from "./cluster";
import { haversineMeters } from "./geo";
import { nearestNeighborOrder, twoOpt } from "./tsp";
import { isFixedTime } from "./schedule";
import { refineOrderWithDistanceFn } from "./refine";

type LatLng = { lat: number; lng: number };

function itemPoint(item: TripItemForPlanning): LatLng | null {
  if (item.lat === null || item.lng === null) return null;
  return { lat: item.lat, lng: item.lng };
}

function groupFlexAroundAnchors(args: {
  anchors: TripItemForPlanning[];
  flex: TripItemForPlanning[];
}): Array<{ anchor: TripItemForPlanning; flex: TripItemForPlanning[] }> {
  const groups = args.anchors
    .slice()
    .sort((a, b) => (a.startsMinute ?? 0) - (b.startsMinute ?? 0))
    .map((a) => ({ anchor: a, flex: [] as TripItemForPlanning[] }));

  if (!groups.length) return [];
  for (const it of args.flex) {
    const p = itemPoint(it);
    if (!p) continue;
    let bestIdx = 0;
    let best = Infinity;
    for (let i = 0; i < groups.length; i += 1) {
      const ap = itemPoint(groups[i]!.anchor);
      if (!ap) continue;
      const d = haversineMeters(p, ap);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    }
    groups[bestIdx]!.flex.push(it);
  }
  return groups;
}

export async function optimizeTripPlan(input: OptimizeInput): Promise<OptimizeResult> {
  const { assigned, unassigned } = clusterAndAssignDays(input);

  const dayPlans: OptimizeResult["dayPlans"] = [];

  for (const day of input.days) {
    const items = (assigned.get(day.dayIndex) ?? []).slice();
    const anchors = items.filter(isFixedTime).sort((a, b) => (a.startsMinute ?? 0) - (b.startsMinute ?? 0));
    const flex = items.filter((it) => !isFixedTime(it));

    // Filter out flex items without coordinates
    const flexWithCoords = flex.filter((it) => itemPoint(it));

    if (!anchors.length) {
      // Pure route optimization on all flex items
      const nn = nearestNeighborOrder(flexWithCoords, (t) => itemPoint(t)!);
      const ordered = twoOpt(nn, (t) => itemPoint(t)!);
      dayPlans.push({
        dayIndex: day.dayIndex,
        orderedItemIds: ordered.map((i) => i.id),
      });
      continue;
    }

    // With anchors: keep anchors order and place flex after nearest anchor (v1 heuristic)
    const grouped = groupFlexAroundAnchors({ anchors, flex: flexWithCoords });
    const orderedIds: string[] = [];

    for (const g of grouped) {
      orderedIds.push(g.anchor.id);
      if (g.flex.length) {
        const nn = nearestNeighborOrder(g.flex, (t) => itemPoint(t)!);
        const refined = await refineOrderWithDistanceFn({
          items: nn,
          getPoint: (t) => itemPoint(t)!,
          // v1: default refine uses haversine; can pass travel-time async fn later
        });
        orderedIds.push(...refined.map((x) => x.id));
      }
    }

    dayPlans.push({ dayIndex: day.dayIndex, orderedItemIds: orderedIds });
  }

  return {
    dayPlans,
    unassigned: unassigned.map((u) => ({ itemId: u.item.id, reason: u.reason })),
  };
}

