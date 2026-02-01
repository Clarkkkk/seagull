import { TRPCError } from "@trpc/server";

import type {
  AddressParts,
  GeocodeCandidate,
  MapProvider,
  MapProviderId,
} from "./types";

type MapboxFeature = {
  id: string;
  type: "Feature";
  place_name: string;
  text: string;
  place_type: string[];
  center: [number, number]; // [lng, lat]
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
};

type MapboxGeocodingResponse = {
  type: "FeatureCollection";
  features: MapboxFeature[];
};

function getMapboxAccessToken(): string {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "MAPBOX_ACCESS_TOKEN is not configured",
    });
  }
  return token;
}

function pickContextText(feature: MapboxFeature, prefix: string): string | undefined {
  const item = feature.context?.find((c) => c.id.startsWith(prefix));
  return item?.text;
}

function normalizeAddress(feature: MapboxFeature): AddressParts {
  const country = pickContextText(feature, "country") ?? "";
  // Mapbox:
  // - region.* is usually province/state
  // - place.* is usually city
  // - locality.* is smaller area (district)
  const province = pickContextText(feature, "region") ?? "";
  const city =
    pickContextText(feature, "place") ??
    pickContextText(feature, "locality") ??
    "";

  return {
    country: country || "Unknown",
    province: province || "Unknown",
    city: city || "Unknown",
    formattedAddress: feature.place_name,
  };
}

export function createMapboxProvider(): MapProvider {
  const id: MapProviderId = "mapbox";

  return {
    id,

    async searchPlaces(query, opts) {
      const token = getMapboxAccessToken();
      const limit = Math.min(Math.max(opts?.limit ?? 5, 1), 10);

      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query,
        )}.json`,
      );
      url.searchParams.set("access_token", token);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("autocomplete", "true");
      url.searchParams.set("types", "poi,address,place,locality,neighborhood");
      url.searchParams.set("language", "zh,en");

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: `Mapbox search failed (${res.status})`,
        });
      }

      const json = (await res.json()) as MapboxGeocodingResponse;
      const candidates: GeocodeCandidate[] = json.features.map((f) => {
        const [lng, lat] = f.center;
        const address = normalizeAddress(f);
        return {
          name: f.text,
          lat,
          lng,
          ...address,
          placeProvider: id,
          placeId: f.id,
        };
      });

      return candidates;
    },

    async reverseGeocode(lat, lng) {
      const token = getMapboxAccessToken();
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`,
      );
      url.searchParams.set("access_token", token);
      url.searchParams.set("limit", "1");
      url.searchParams.set("language", "zh,en");

      const res = await fetch(url, { method: "GET" });
      if (!res.ok) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: `Mapbox reverse geocode failed (${res.status})`,
        });
      }

      const json = (await res.json()) as MapboxGeocodingResponse;
      const feature = json.features[0];
      if (!feature) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No address found for coordinates",
        });
      }

      return normalizeAddress(feature);
    },
  };
}

