import { TRPCError } from "@trpc/server";

import { and, asc, eq, isNull, sql } from "@acme/db";
import type { db as DbInstance } from "@acme/db/client";
import { WishlistJar, WishlistJarImage } from "@acme/db/schema";

import { deleteObject, requestPresignedUpload } from "../storage/s3";

type Db = typeof DbInstance;

const MAX_JAR_IMAGES = 9;

async function requireJar(args: { db: Db; jarId: string; userId: string }) {
  const jar = await args.db.query.WishlistJar.findFirst({
    where: (j, { and, eq }) => and(eq(j.id, args.jarId), eq(j.userId, args.userId)),
  });
  if (!jar) throw new TRPCError({ code: "NOT_FOUND", message: "Jar not found" });
  return jar;
}

export async function listJarImages(args: { db: Db; jarId: string; userId: string }) {
  await requireJar(args);
  return args.db.query.WishlistJarImage.findMany({
    where: (img, { and, eq, isNull }) =>
      and(eq(img.jarId, args.jarId), eq(img.userId, args.userId), isNull(img.deletedAt)),
    orderBy: asc(WishlistJarImage.createdAt),
  });
}

async function getDefaultCoverImage(args: { db: Db; jarId: string; userId: string }) {
  const [image] = await args.db.query.WishlistJarImage.findMany({
    where: (img, { and, eq, isNull }) =>
      and(eq(img.jarId, args.jarId), eq(img.userId, args.userId), isNull(img.deletedAt)),
    orderBy: asc(WishlistJarImage.createdAt),
    limit: 1,
  });
  return image ?? null;
}

async function ensureDefaultCover(args: { db: Db; jarId: string; userId: string }) {
  const jar = await requireJar(args);
  if (jar.coverImageId || jar.coverImageKey || jar.coverImageUrl) return;
  const image = await getDefaultCoverImage(args);
  if (!image) return;
  await args.db
    .update(WishlistJar)
    .set({ coverImageId: image.id })
    .where(eq(WishlistJar.id, args.jarId));
}

async function getActiveImageCount(args: { db: Db; jarId: string; userId: string }) {
  const [row] = await args.db
    .select({ count: sql<number>`count(*)` })
    .from(WishlistJarImage)
    .where(
      and(
        eq(WishlistJarImage.jarId, args.jarId),
        eq(WishlistJarImage.userId, args.userId),
        isNull(WishlistJarImage.deletedAt),
      ),
    );
  return Number(row?.count ?? 0);
}

export async function requestJarImageUpload(args: {
  db: Db;
  jarId: string;
  userId: string;
  contentType: string;
  kind: "image" | "cover";
}) {
  await requireJar(args);
  if (args.kind === "image") {
    const count = await getActiveImageCount(args);
    if (count >= MAX_JAR_IMAGES) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Jar image limit reached" });
    }
  }

  return requestPresignedUpload({
    keyPrefix: `wishlist/jars/${args.jarId}`,
    contentType: args.contentType,
    kind: args.kind,
  });
}

export async function confirmJarImageUpload(args: {
  db: Db;
  jarId: string;
  userId: string;
  key: string;
  url: string;
  width?: number | null;
  height?: number | null;
}) {
  await requireJar(args);
  const count = await getActiveImageCount(args);
  if (count >= MAX_JAR_IMAGES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Jar image limit reached" });
  }

  const [created] = await args.db
    .insert(WishlistJarImage)
    .values({
      jarId: args.jarId,
      userId: args.userId,
      url: args.url,
      key: args.key,
      width: args.width ?? null,
      height: args.height ?? null,
    })
    .returning();

  await ensureDefaultCover(args);

  return created;
}

export async function deleteJarImage(args: {
  db: Db;
  jarId: string;
  userId: string;
  imageId: string;
}) {
  await requireJar(args);
  const image = await args.db.query.WishlistJarImage.findFirst({
    where: (img, { and, eq }) =>
      and(
        eq(img.id, args.imageId),
        eq(img.jarId, args.jarId),
        eq(img.userId, args.userId),
        isNull(img.deletedAt),
      ),
  });
  if (!image) throw new TRPCError({ code: "NOT_FOUND", message: "Image not found" });

  await args.db
    .update(WishlistJarImage)
    .set({ deletedAt: new Date() })
    .where(eq(WishlistJarImage.id, image.id));

  const jar = await requireJar(args);
  if (jar.coverImageId === image.id) {
    await args.db
      .update(WishlistJar)
      .set({
        coverImageId: null,
        coverImageKey: null,
        coverImageUrl: null,
      })
      .where(eq(WishlistJar.id, args.jarId));
    await ensureDefaultCover(args);
  }

  if (image.key && !image.key.startsWith("link:")) {
    await deleteObject(image.key).catch(() => null);
  }

  return { success: true as const };
}

export async function setCoverFromImage(args: {
  db: Db;
  jarId: string;
  userId: string;
  imageId: string;
}) {
  const jar = await requireJar(args);
  const image = await args.db.query.WishlistJarImage.findFirst({
    where: (img, { and, eq }) =>
      and(
        eq(img.id, args.imageId),
        eq(img.jarId, args.jarId),
        eq(img.userId, args.userId),
        isNull(img.deletedAt),
      ),
  });
  if (!image) throw new TRPCError({ code: "NOT_FOUND", message: "Image not found" });

  const [updated] = await args.db
    .update(WishlistJar)
    .set({
      coverImageId: image.id,
      coverImageUrl: null,
      coverImageKey: null,
    })
    .where(eq(WishlistJar.id, args.jarId))
    .returning();

  if (jar.coverImageKey && !jar.coverImageKey.startsWith("link:")) {
    await deleteObject(jar.coverImageKey).catch(() => null);
  }

  return updated;
}

export async function setCoverFromUpload(args: {
  db: Db;
  jarId: string;
  userId: string;
  key: string;
  url: string;
}) {
  const jar = await requireJar(args);
  const [updated] = await args.db
    .update(WishlistJar)
    .set({
      coverImageId: null,
      coverImageKey: args.key,
      coverImageUrl: args.url,
    })
    .where(eq(WishlistJar.id, args.jarId))
    .returning();
  if (jar.coverImageKey && !jar.coverImageKey.startsWith("link:")) {
    await deleteObject(jar.coverImageKey).catch(() => null);
  }
  return updated;
}

export async function clearCover(args: { db: Db; jarId: string; userId: string }) {
  const jar = await requireJar(args);
  const [updated] = await args.db
    .update(WishlistJar)
    .set({
      coverImageId: null,
      coverImageKey: null,
      coverImageUrl: null,
    })
    .where(eq(WishlistJar.id, args.jarId))
    .returning();
  if (jar.coverImageKey && !jar.coverImageKey.startsWith("link:")) {
    await deleteObject(jar.coverImageKey).catch(() => null);
  }
  await ensureDefaultCover(args);
  return updated;
}

export async function addLinkImagesToJar(args: {
  db: Db;
  jarId: string;
  userId: string;
  urls: string[];
}) {
  await requireJar(args);
  if (!args.urls.length) return [];
  const count = await getActiveImageCount(args);
  const remaining = Math.max(0, MAX_JAR_IMAGES - count);
  if (!remaining) return [];
  const values = args.urls.slice(0, remaining).map((url) => ({
    jarId: args.jarId,
    userId: args.userId,
    url,
    key: `link:${url}`,
  }));
  const inserted = await args.db.insert(WishlistJarImage).values(values).returning();
  await ensureDefaultCover(args);
  return inserted;
}
