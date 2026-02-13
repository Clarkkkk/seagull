import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq, sql } from "@acme/db";
import { WishlistJar, WishlistJarTrip } from "@acme/db/schema";

import { reverseGeocodeCached } from "../services/map-provider";
import { parseWishlistLink } from "../services/wishlist/link-parser";
import {
  clearCover,
  confirmJarImageUpload,
  deleteJarImage,
  listJarImages,
  requestJarImageUpload,
  setCoverFromImage,
  setCoverFromUpload,
} from "../services/wishlist/jar-images";
import { protectedProcedure } from "../trpc";

const JarStatusSchema = z.enum(["inactive", "in_trip", "archived"]);

export const wishlistRouter = {
  list: protectedProcedure
    .input(
      z.object({
        status: JarStatusSchema.optional(),
        country: z.string().trim().min(1).max(100).optional(),
        province: z.string().trim().min(1).max(100).optional(),
        city: z.string().trim().min(1).max(100).optional(),
        q: z.string().trim().min(1).max(200).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(({ ctx, input }) => {
      const userId = ctx.session.user.id;

      return ctx.db.query.WishlistJar.findMany({
        where: (jar, { and, eq, ilike, or }) => {
          const clauses = [eq(jar.userId, userId)];

          if (input.status) {
            clauses.push(eq(jar.status, input.status));
          } else {
            // Default: hide archived
            const visible = or(eq(jar.status, "inactive"), eq(jar.status, "in_trip"));
            if (visible) clauses.push(visible);
          }

          if (input.country) clauses.push(eq(jar.country, input.country));
          if (input.province) clauses.push(eq(jar.province, input.province));
          if (input.city) clauses.push(eq(jar.city, input.city));

          if (input.q) {
            const q = `%${input.q}%`;
            const qClause = or(
              ilike(jar.name, q),
              ilike(sql`coalesce(${jar.note}, '')`, q),
              ilike(sql`coalesce(${jar.formattedAddress}, '')`, q),
            );
            if (qClause) clauses.push(qClause);
          }

          return and(...clauses);
        },
        orderBy: desc(WishlistJar.updatedAt),
        limit: input.limit,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const jar = await ctx.db.query.WishlistJar.findFirst({
        where: (j, { and, eq }) => and(eq(j.id, input.id), eq(j.userId, userId)),
      });
      if (!jar) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jar not found" });
      }

      const rel = await ctx.db.query.WishlistJarTrip.findFirst({
        where: (r, { eq }) => eq(r.jarId, jar.id),
      });

      return { jar, tripId: rel?.tripId ?? null };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(200),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        linkUrl: z.string().url().optional(),
        note: z.string().max(5000).optional(),
        sourceType: z.enum(["map", "link", "share", "manual"]).default("map"),
        sourceTitle: z.string().max(500).optional(),
        sourceRawText: z.string().max(5000).optional(),
        placeProvider: z.string().optional(),
        placeId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const addr = await reverseGeocodeCached(input.lat, input.lng);

      const [created] = await ctx.db
        .insert(WishlistJar)
        .values({
          userId,
          status: "inactive",
          name: input.name,
          country: addr.country,
          province: addr.province,
          city: addr.city,
          lat: input.lat,
          lng: input.lng,
          formattedAddress: addr.formattedAddress,
          note: input.note,
          linkUrl: input.linkUrl,
          sourceType: input.sourceType,
          sourceTitle: input.sourceTitle,
          sourceRawText: input.sourceRawText,
          placeProvider: input.placeProvider ?? "mapbox",
          placeId: input.placeId,
        })
        .returning();

      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Create jar failed" });
      }

      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(200).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        linkUrl: z.string().url().optional().nullable(),
        note: z.string().max(5000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const jar = await ctx.db.query.WishlistJar.findFirst({
        where: (j, { and, eq }) => and(eq(j.id, input.id), eq(j.userId, userId)),
      });
      if (!jar) throw new TRPCError({ code: "NOT_FOUND" });

      const nextLat = input.lat ?? jar.lat;
      const nextLng = input.lng ?? jar.lng;

      const coordsChanged = nextLat !== jar.lat || nextLng !== jar.lng;
      const addr = coordsChanged ? await reverseGeocodeCached(nextLat, nextLng) : null;

      const [updated] = await ctx.db
        .update(WishlistJar)
        .set({
          name: input.name ?? jar.name,
          lat: nextLat,
          lng: nextLng,
          linkUrl: input.linkUrl === undefined ? jar.linkUrl : input.linkUrl ?? null,
          note: input.note === undefined ? jar.note : input.note ?? null,
          ...(addr
            ? {
                country: addr.country,
                province: addr.province,
                city: addr.city,
                formattedAddress: addr.formattedAddress ?? null,
              }
            : null),
        })
        .where(eq(WishlistJar.id, jar.id))
        .returning();

      return updated;
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const jar = await ctx.db.query.WishlistJar.findFirst({
        where: (j, { and, eq }) => and(eq(j.id, input.id), eq(j.userId, userId)),
      });
      if (!jar) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.transaction(async (tx) => {
        await tx.delete(WishlistJarTrip).where(eq(WishlistJarTrip.jarId, jar.id));
        await tx
          .update(WishlistJar)
          .set({ status: "archived" })
          .where(eq(WishlistJar.id, jar.id));
      });

      return { success: true };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const jar = await ctx.db.query.WishlistJar.findFirst({
        where: (j, { and, eq }) => and(eq(j.id, input.id), eq(j.userId, userId)),
      });
      if (!jar) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .update(WishlistJar)
        .set({ status: "inactive" })
        .where(eq(WishlistJar.id, jar.id));

      return { success: true };
    }),

  attachToTrip: protectedProcedure
    .input(z.object({ jarId: z.string().uuid(), tripId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const jar = await ctx.db.query.WishlistJar.findFirst({
        where: (j, { and, eq }) => and(eq(j.id, input.jarId), eq(j.userId, userId)),
      });
      if (!jar) throw new TRPCError({ code: "NOT_FOUND", message: "Jar not found" });

      const trip = await ctx.db.query.Trip.findFirst({
        where: (t, { and, eq }) => and(eq(t.id, input.tripId), eq(t.userId, userId)),
      });
      if (!trip) throw new TRPCError({ code: "NOT_FOUND", message: "Trip not found" });

      await ctx.db.transaction(async (tx) => {
        // ensure 1-jar-1-trip for v1
        await tx
          .delete(WishlistJarTrip)
          .where(eq(WishlistJarTrip.jarId, jar.id));
        await tx.insert(WishlistJarTrip).values({ jarId: jar.id, tripId: trip.id });
        await tx
          .update(WishlistJar)
          .set({ status: "in_trip" })
          .where(eq(WishlistJar.id, jar.id));
      });

      return { success: true };
    }),

  detachFromTrip: protectedProcedure
    .input(z.object({ jarId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const jar = await ctx.db.query.WishlistJar.findFirst({
        where: (j, { and, eq }) => and(eq(j.id, input.jarId), eq(j.userId, userId)),
      });
      if (!jar) throw new TRPCError({ code: "NOT_FOUND", message: "Jar not found" });

      await ctx.db.transaction(async (tx) => {
        await tx
          .delete(WishlistJarTrip)
          .where(eq(WishlistJarTrip.jarId, jar.id));
        await tx
          .update(WishlistJar)
          .set({ status: "inactive" })
          .where(eq(WishlistJar.id, jar.id));
      });

      return { success: true };
    }),

  listImages: protectedProcedure
    .input(z.object({ jarId: z.string().uuid() }))
    .query(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return listJarImages({ db: ctx.db, jarId: input.jarId, userId });
    }),

  requestImageUpload: protectedProcedure
    .input(
      z.object({
        jarId: z.string().uuid(),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        kind: z.enum(["image", "cover"]),
      }),
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return requestJarImageUpload({
        db: ctx.db,
        jarId: input.jarId,
        userId,
        contentType: input.contentType,
        kind: input.kind,
      });
    }),

  confirmImageUpload: protectedProcedure
    .input(
      z.object({
        jarId: z.string().uuid(),
        key: z.string().min(1),
        url: z.string().url(),
        width: z.number().int().positive().optional().nullable(),
        height: z.number().int().positive().optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return confirmJarImageUpload({
        db: ctx.db,
        jarId: input.jarId,
        userId,
        key: input.key,
        url: input.url,
        width: input.width,
        height: input.height,
      });
    }),

  deleteImage: protectedProcedure
    .input(z.object({ jarId: z.string().uuid(), imageId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return deleteJarImage({ db: ctx.db, jarId: input.jarId, userId, imageId: input.imageId });
    }),

  setCover: protectedProcedure
    .input(
      z.union([
        z.object({ jarId: z.string().uuid(), imageId: z.string().uuid(), kind: z.literal("image") }),
        z.object({
          jarId: z.string().uuid(),
          key: z.string().min(1),
          url: z.string().url(),
          kind: z.literal("upload"),
        }),
      ]),
    )
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      if (input.kind === "image") {
        return setCoverFromImage({ db: ctx.db, jarId: input.jarId, userId, imageId: input.imageId });
      }
      return setCoverFromUpload({
        db: ctx.db,
        jarId: input.jarId,
        userId,
        key: input.key,
        url: input.url,
      });
    }),

  clearCover: protectedProcedure
    .input(z.object({ jarId: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      const userId = ctx.session.user.id;
      return clearCover({ db: ctx.db, jarId: input.jarId, userId });
    }),

  parseLink: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .query(({ input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
      return parseWishlistLink(input.url);
    }),
} satisfies TRPCRouterRecord;

