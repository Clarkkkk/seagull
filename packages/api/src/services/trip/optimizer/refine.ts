import type { LatLng } from "./types";
import type { DistanceFn } from "./tsp";
import { haversineMeters } from "./geo";
import { twoOpt } from "./tsp";

/**
 * Optional refinement step.
 *
 * v1 default: uses haversine distance.
 * Future: pass a travel-time-based distanceFn (e.g. from map provider) for better accuracy.
 */
export async function refineOrderWithDistanceFn<T>(args: {
  items: T[];
  getPoint: (t: T) => LatLng;
  distanceFn?: DistanceFn | ((a: LatLng, b: LatLng) => Promise<number>);
}): Promise<T[]> {
  if (args.items.length < 4) return args.items.slice();

  const distanceFn = args.distanceFn ?? haversineMeters;
  if (distanceFn === haversineMeters) return twoOpt(args.items, args.getPoint, haversineMeters, 120);

  const p0 = args.getPoint(args.items[0]!);
  const p1 = args.getPoint(args.items[1]!);
  const probe = (distanceFn as any)(p0, p1);
  const isPromiseLike = !!probe && typeof (probe).then === "function";
  if (isPromiseLike) void (probe as Promise<unknown>).catch(() => {});
  if (!isPromiseLike) return twoOpt(args.items, args.getPoint, distanceFn as DistanceFn, 120);

  const cache = new Map<string, number>();
  const asyncFn = distanceFn as unknown as (a: LatLng, b: LatLng) => Promise<number>;
  const key = (a: LatLng, b: LatLng) => `${a.lat},${a.lng}|${b.lat},${b.lng}`;
  const syncWrapper: DistanceFn = (a, b) => {
    const k = key(a, b);
    const cached = cache.get(k);
    if (cached !== undefined) return cached;
    const fallback = haversineMeters(a, b);
    cache.set(k, fallback);
    void asyncFn(a, b).then((v) => cache.set(k, v)).catch(() => {});
    return fallback;
  };

  return twoOpt(args.items, args.getPoint, syncWrapper, 80);
}

