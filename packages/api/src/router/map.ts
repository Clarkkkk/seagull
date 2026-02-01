import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { protectedProcedure } from "../trpc";
import { getMapProvider, reverseGeocodeCached } from "../services/map-provider";

export const mapRouter = {
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().trim().min(1).max(200),
        limit: z.number().int().min(1).max(10).optional(),
      }),
    )
    .query(async ({ input }) => {
      const provider = getMapProvider();
      return provider.searchPlaces(input.query, { limit: input.limit });
    }),

  reverseGeocode: protectedProcedure
    .input(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      }),
    )
    .query(({ input }) => {
      return reverseGeocodeCached(input.lat, input.lng);
    }),
} satisfies TRPCRouterRecord;

