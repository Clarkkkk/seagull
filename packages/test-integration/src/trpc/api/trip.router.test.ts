import { TRPCClientError } from "@trpc/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApiTestServer } from "./server";
import { UUIDS, seedTrip, seedTripCollaborator, seedTripDay, seedTripItem, seedTripLock } from "./seed";

function expectZodError(err: unknown) {
  expect(err).toBeInstanceOf(TRPCClientError);
  const e = err as TRPCClientError<any>;
  expect(e.data?.code).toBe("BAD_REQUEST");
}

async function expectRejectsZod(p: Promise<unknown>) {
  try {
    await p;
    throw new Error("expected zod error");
  } catch (err) {
    expectZodError(err);
  }
}

describe("api.trip router", () => {
  const userA = "userA";
  const userB = "userB";

  let server: Awaited<ReturnType<typeof createApiTestServer>>;

  beforeAll(async () => {
    server = await createApiTestServer();
  });

  beforeEach(async () => {
    await server.dbHarness.resetDb();
  });

  it("list returns owned + collaborator trips with isOwner flag", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA, title: "A" });
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripB, userId: userB, title: "B" });
    await seedTripCollaborator({ client: server.dbHarness.client, tripId: UUIDS.tripB, userId: userA });

    const client = server.makeClient(userA);
    const trips = await client.trip.list.query({ limit: 50 });

    const byId = new Map(trips.map((t) => [t.id, t]));
    expect(byId.get(UUIDS.tripA)?.isOwner).toBe(true);
    expect(byId.get(UUIDS.tripB)?.isOwner).toBe(false);
  });

  it("list rejects invalid input (limit out of range)", async () => {
    const client = server.makeClient(userA);
    await expectRejectsZod(client.trip.list.query({ limit: 0 }));
  });

  it("getById returns plan + lock for owner", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA, title: "A" });
    await seedTripDay({ client: server.dbHarness.client, id: UUIDS.dayA0, tripId: UUIDS.tripA, dayIndex: 0, date: "2026-01-01" });
    await seedTripItem({
      client: server.dbHarness.client,
      id: UUIDS.itemA,
      tripId: UUIDS.tripA,
      dayId: UUIDS.dayA0,
      type: "poi",
      order: 0,
      title: "ItemA",
    });
    await seedTripLock({ client: server.dbHarness.client, tripId: UUIDS.tripA, userId: userA, expiresInSeconds: 60 });

    const client = server.makeClient(userA);
    const result = await client.trip.getById.query({ id: UUIDS.tripA });

    expect(result.trip.id).toBe(UUIDS.tripA);
    expect(result.lock?.tripId).toBe(UUIDS.tripA);
    expect(result.plan.days).toHaveLength(1);
    expect(result.plan.days[0]?.items).toHaveLength(1);
  });

  it("getById returns NOT_FOUND for non-owner/non-collaborator", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA });
    const client = server.makeClient(userB);
    await expect(client.trip.getById.query({ id: UUIDS.tripA })).rejects.toMatchObject({
      data: { code: "NOT_FOUND" },
    });
  });

  it("getById rejects invalid input (non-uuid)", async () => {
    const client = server.makeClient(userA);
    await expectRejectsZod(client.trip.getById.query({ id: "not-uuid" as any }));
  });

  it("create creates trip, and seeds days when both startDate/endDate provided", async () => {
    const client = server.makeClient(userA);
    const created = await client.trip.create.mutate({
      title: "T1",
      startDate: "2026-01-01",
      endDate: "2026-01-03",
    });

    expect(created.title).toBe("T1");

    const days = (await server.dbHarness.client.query(`
      SELECT COUNT(*)::int AS n FROM trip_day WHERE trip_id = '${created.id}';
    `)) as any;
    expect(days.rows[0]?.n).toBe(3);
  });

  it("create rejects invalid input (empty title)", async () => {
    const client = server.makeClient(userA);
    await expectRejectsZod(client.trip.create.mutate({ title: "" }));
  });

  it("updateMeta requires lock (CONFLICT) and owner", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA, title: "Old" });
    const client = server.makeClient(userA);
    await expect(client.trip.updateMeta.mutate({ tripId: UUIDS.tripA, title: "New" })).rejects.toMatchObject({
      data: { code: "CONFLICT" },
    });
  });

  it("updateMeta rejects when startDate/endDate are not provided together (BAD_REQUEST)", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA, title: "Old" });
    await seedTripLock({ client: server.dbHarness.client, tripId: UUIDS.tripA, userId: userA });
    const client = server.makeClient(userA);
    await expect(client.trip.updateMeta.mutate({ tripId: UUIDS.tripA, startDate: "2026-01-01" })).rejects.toMatchObject({
      data: { code: "BAD_REQUEST" },
    });
  });

  it("lock.acquire succeeds for owner and conflicts for another user", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA });
    await seedTripCollaborator({ client: server.dbHarness.client, tripId: UUIDS.tripA, userId: userB });

    const a = server.makeClient(userA);
    const b = server.makeClient(userB);

    const lock = await a.trip.lock.acquire.mutate({ tripId: UUIDS.tripA });
    expect(lock.userId).toBe(userA);

    await expect(b.trip.lock.acquire.mutate({ tripId: UUIDS.tripA })).rejects.toMatchObject({
      data: { code: "CONFLICT" },
    });
  });

  it("lock.get returns NOT_FOUND when trip not accessible", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA });
    const b = server.makeClient(userB);
    await expect(b.trip.lock.get.query({ tripId: UUIDS.tripA })).rejects.toMatchObject({
      data: { code: "NOT_FOUND" },
    });
  });

  it("plan.save rejects overlaps with BAD_REQUEST", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA, version: 1 });
    await seedTripDay({ client: server.dbHarness.client, id: UUIDS.dayA0, tripId: UUIDS.tripA, dayIndex: 0, date: "2026-01-01" });
    await seedTripLock({ client: server.dbHarness.client, tripId: UUIDS.tripA, userId: userA });

    const client = server.makeClient(userA);
    await expect(
      client.trip.plan.save.mutate({
        tripId: UUIDS.tripA,
        days: [{ dayIndex: 0, date: "2026-01-01" }],
        items: [
          { dayIndex: 0, type: "poi", order: 0, title: "A", startsMinute: 100, endsMinute: 200 },
          { dayIndex: 0, type: "poi", order: 1, title: "B", startsMinute: 150, endsMinute: 250 },
        ],
      } as any),
    ).rejects.toMatchObject({ data: { code: "BAD_REQUEST" } });
  });

  it("snapshots.list returns NOT_FOUND when trip not accessible", async () => {
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId: userA });
    const b = server.makeClient(userB);
    await expect(b.trip.snapshots.list.query({ tripId: UUIDS.tripA, limit: 20 })).rejects.toMatchObject({
      data: { code: "NOT_FOUND" },
    });
  });
});

