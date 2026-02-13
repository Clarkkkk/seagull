import { TRPCClientError } from "@trpc/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiTestServer } from "./server";
import { UUIDS, seedTrip, seedWishlistJar, seedWishlistJarTrip } from "./seed";

async function expectRejectsZod(p: Promise<unknown>) {
  try {
    await p;
    throw new Error("expected zod error");
  } catch (err) {
    expect(err).toBeInstanceOf(TRPCClientError);
    expect((err as TRPCClientError<any>).data?.code).toBe("BAD_REQUEST");
  }
}

describe("api.wishlist router", () => {
  const userA = "userA";
  const userB = "userB";

  let server: Awaited<ReturnType<typeof createApiTestServer>>;

  beforeAll(async () => {
    server = await createApiTestServer();
  });

  beforeEach(async () => {
    await server.dbHarness.resetDb();
  });

  it("list hides archived by default and supports status filter", async () => {
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "inactive" });
    await seedWishlistJar({
      client: server.dbHarness.client,
      id: "88888888-8888-4888-8888-888888888888",
      userId: userA,
      status: "archived",
    });

    const client = server.makeClient(userA);
    const visible = await client.wishlist.list.query({ limit: 50 });
    expect(visible.map((j) => j.status)).not.toContain("archived");

    const archived = await client.wishlist.list.query({ status: "archived", limit: 50 });
    expect(archived).toHaveLength(1);
    expect(archived[0]!.status).toBe("archived");
  });

  it("getById returns jar + tripId, and NOT_FOUND for other users", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA, title: "TripA" });
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "in_trip" });
    await seedWishlistJarTrip({ client: server.dbHarness.client, id: UUIDS.jarTripA, jarId: UUIDS.jarA, tripId: UUIDS.tripA });

    const clientA = server.makeClient(userA);
    const res = await clientA.wishlist.getById.query({ id: UUIDS.jarA });
    expect(res.jar.id).toBe(UUIDS.jarA);
    expect(res.tripId).toBe(UUIDS.tripA);

    const clientB = server.makeClient(userB);
    await expect(clientB.wishlist.getById.query({ id: UUIDS.jarA })).rejects.toMatchObject({
      data: { code: "NOT_FOUND" },
    });
  });

  it("getById rejects invalid input (non-uuid)", async () => {
    const client = server.makeClient(userA);
    await expectRejectsZod(client.wishlist.getById.query({ id: "not-uuid" as any }));
  });

  it("create calls reverseGeocodeCached and persists address + status inactive", async () => {
    const client = server.makeClient(userA);
    const created = await client.wishlist.create.mutate({
      name: "Coffee",
      lat: 30.1,
      lng: 120.1,
    });
    expect(created).toBeDefined();
    expect(created!.userId).toBe(userA);
    expect(created!.status).toBe("inactive");
    expect(created!.country).toBeTruthy();
    expect(created!.province).toBeTruthy();
    expect(created!.city).toBeTruthy();
  });

  it("create rejects invalid input (empty name)", async () => {
    const client = server.makeClient(userA);
    await expectRejectsZod(client.wishlist.create.mutate({ name: "" as any, lat: 0, lng: 0 }));
  });

  it("update updates jar and re-geocodes when coords change", async () => {
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "inactive" });
    const client = server.makeClient(userA);

    const updated = await client.wishlist.update.mutate({ id: UUIDS.jarA, lat: 30.2, lng: 120.2, name: "New" });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe("New");
    expect(updated!.country).toBeTruthy();
    expect(updated!.province).toBeTruthy();
    expect(updated!.city).toBeTruthy();
  });

  it("archive sets status archived and removes jar-trip relation", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA, title: "TripA" });
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "in_trip" });
    await seedWishlistJarTrip({ client: server.dbHarness.client, id: UUIDS.jarTripA, jarId: UUIDS.jarA, tripId: UUIDS.tripA });

    const client = server.makeClient(userA);
    await client.wishlist.archive.mutate({ id: UUIDS.jarA });

    const relCount = (await server.dbHarness.client.query(`
      SELECT COUNT(*)::int AS n FROM wishlist_jar_trip WHERE jar_id = '${UUIDS.jarA}';
    `)) as any;
    expect(relCount.rows[0]?.n).toBe(0);

    const jar = await client.wishlist.getById.query({ id: UUIDS.jarA });
    expect(jar.jar.status).toBe("archived");
  });

  it("restore sets status inactive", async () => {
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "archived" });
    const client = server.makeClient(userA);
    await client.wishlist.restore.mutate({ id: UUIDS.jarA });
    const jar = await client.wishlist.getById.query({ id: UUIDS.jarA });
    expect(jar.jar.status).toBe("inactive");
  });

  it("attachToTrip sets status in_trip and enforces 1-jar-1-trip", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA, title: "TripA" });
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripB, userId: userA, title: "TripB" });
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "inactive" });

    const client = server.makeClient(userA);
    await client.wishlist.attachToTrip.mutate({ jarId: UUIDS.jarA, tripId: UUIDS.tripA });
    await client.wishlist.attachToTrip.mutate({ jarId: UUIDS.jarA, tripId: UUIDS.tripB });

    const rel = (await server.dbHarness.client.query(`
      SELECT trip_id FROM wishlist_jar_trip WHERE jar_id = '${UUIDS.jarA}';
    `)) as any;
    expect(rel.rows[0]?.trip_id).toBe(UUIDS.tripB);

    const jar = await client.wishlist.getById.query({ id: UUIDS.jarA });
    expect(jar.jar.status).toBe("in_trip");
  });

  it("detachFromTrip sets status inactive and removes relation", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA, title: "TripA" });
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "in_trip" });
    await seedWishlistJarTrip({ client: server.dbHarness.client, id: UUIDS.jarTripA, jarId: UUIDS.jarA, tripId: UUIDS.tripA });

    const client = server.makeClient(userA);
    await client.wishlist.detachFromTrip.mutate({ jarId: UUIDS.jarA });

    const relCount = (await server.dbHarness.client.query(`
      SELECT COUNT(*)::int AS n FROM wishlist_jar_trip WHERE jar_id = '${UUIDS.jarA}';
    `)) as any;
    expect(relCount.rows[0]?.n).toBe(0);

    const jar = await client.wishlist.getById.query({ id: UUIDS.jarA });
    expect(jar.jar.status).toBe("inactive");
  });

  it("listImages returns jar images in created order", async () => {
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "inactive" });
    const client = server.makeClient(userA);

    const first = await client.wishlist.confirmImageUpload.mutate({
      jarId: UUIDS.jarA,
      key: "k1",
      url: "https://img.example/1.jpg",
    });
    const second = await client.wishlist.confirmImageUpload.mutate({
      jarId: UUIDS.jarA,
      key: "k2",
      url: "https://img.example/2.jpg",
    });

    const images = await client.wishlist.listImages.query({ jarId: UUIDS.jarA });
    expect(images.map((img) => img.id)).toEqual([first?.id, second?.id]);
  });

  it("confirmImageUpload enforces the 9-image limit", async () => {
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "inactive" });
    const client = server.makeClient(userA);

    for (let i = 0; i < 9; i += 1) {
      await client.wishlist.confirmImageUpload.mutate({
        jarId: UUIDS.jarA,
        key: `k-${i}`,
        url: `https://img.example/${i}.jpg`,
      });
    }

    await expect(
      client.wishlist.confirmImageUpload.mutate({
        jarId: UUIDS.jarA,
        key: "k-over",
        url: "https://img.example/overflow.jpg",
      }),
    ).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
  });

  it("setCover and deleteImage fallback to first image", async () => {
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId: userA, status: "inactive" });
    const client = server.makeClient(userA);

    const first = await client.wishlist.confirmImageUpload.mutate({
      jarId: UUIDS.jarA,
      key: "k1",
      url: "https://img.example/1.jpg",
    });
    const second = await client.wishlist.confirmImageUpload.mutate({
      jarId: UUIDS.jarA,
      key: "k2",
      url: "https://img.example/2.jpg",
    });

    await client.wishlist.setCover.mutate({ jarId: UUIDS.jarA, kind: "image", imageId: second!.id });
    const withCover = await client.wishlist.getById.query({ id: UUIDS.jarA });
    expect(withCover.jar.coverImageId).toBe(second?.id);

    await client.wishlist.deleteImage.mutate({ jarId: UUIDS.jarA, imageId: second!.id });
    const afterDelete = await client.wishlist.getById.query({ id: UUIDS.jarA });
    expect(afterDelete.jar.coverImageId).toBe(first?.id);
  });

  it("parseLink returns parsed info for Xiaohongshu short URL", async () => {
    const client = server.makeClient(userA);
    const parsed = await client.wishlist.parseLink.query({
      url: "http://xhslink.com/a/tyoREa3ciaAeb",
    });

    expect(parsed.provider).toBe("xiaohongshu");
    expect(parsed.title).toBe("测试标题");
    expect(parsed.content).toBe("测试内容");
    expect(parsed.images).toHaveLength(2);
  });

  it("parseLink rejects invalid input", async () => {
    const client = server.makeClient(userA);
    await expectRejectsZod(client.wishlist.parseLink.query({ url: "not-a-url" as any }));
  });
});

