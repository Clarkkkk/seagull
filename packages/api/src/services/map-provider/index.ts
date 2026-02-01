import { TRPCError } from "@trpc/server";

import { createMapboxProvider } from "./mapbox";
import type { MapProvider } from "./types";

type CacheEntry<T> = { value: T; expiresAt: number };

const reverseCache = new Map<string, CacheEntry<Awaited<ReturnType<MapProvider["reverseGeocode"]>>>>();
const REVERSE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function round5(n: number) {
  return Math.round(n * 1e5) / 1e5;
}

export function getMapProvider(): MapProvider {
  const provider = (process.env.MAP_PROVIDER ?? "mapbox").toLowerCase();
  if (provider === "mapbox") return createMapboxProvider();
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Unsupported MAP_PROVIDER: ${provider}`,
  });
}

export async function reverseGeocodeCached(lat: number, lng: number) {
  const key = `${round5(lat)},${round5(lng)}`;
  const now = Date.now();
  const cached = reverseCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const provider = getMapProvider();
  const value = await provider.reverseGeocode(lat, lng);
  reverseCache.set(key, { value, expiresAt: now + REVERSE_CACHE_TTL_MS });
  return value;
}

