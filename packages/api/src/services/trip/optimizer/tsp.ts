import type { LatLng } from "./types";
import { haversineMeters } from "./geo";

export type DistanceFn = (a: LatLng, b: LatLng) => number;

export function nearestNeighborOrder<T>(items: T[], getPoint: (t: T) => LatLng): T[] {
  if (items.length <= 2) return items.slice();
  const remaining = items.slice();
  const route: T[] = [];

  // start from first item for determinism
  route.push(remaining.shift()!);

  while (remaining.length) {
    const last = route[route.length - 1]!;
    const lastP = getPoint(last);
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const candP = getPoint(remaining[i]!);
      const d = haversineMeters(lastP, candP);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    route.push(remaining.splice(bestIdx, 1)[0]!);
  }
  return route;
}

export function pathDistance<T>(route: T[], getPoint: (t: T) => LatLng, distanceFn: DistanceFn): number {
  let dist = 0;
  for (let i = 0; i < route.length - 1; i += 1) {
    dist += distanceFn(getPoint(route[i]!), getPoint(route[i + 1]!));
  }
  return dist;
}

export function twoOpt<T>(
  route: T[],
  getPoint: (t: T) => LatLng,
  distanceFn: DistanceFn = haversineMeters,
  maxIterations = 200,
): T[] {
  if (route.length < 4) return route.slice();
  let best = route.slice();
  let bestDist = pathDistance(best, getPoint, distanceFn);

  let improved = true;
  let iter = 0;
  while (improved && iter < maxIterations) {
    improved = false;
    iter += 1;
    for (let i = 1; i < best.length - 2; i += 1) {
      for (let k = i + 1; k < best.length - 1; k += 1) {
        const candidate = best.slice();
        // reverse segment i..k
        const segment = candidate.slice(i, k + 1).reverse();
        candidate.splice(i, k - i + 1, ...segment);
        const candDist = pathDistance(candidate, getPoint, distanceFn);
        if (candDist + 1e-6 < bestDist) {
          best = candidate;
          bestDist = candDist;
          improved = true;
        }
      }
    }
  }
  return best;
}

