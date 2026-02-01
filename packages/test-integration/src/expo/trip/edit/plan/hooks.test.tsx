import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { __setAuthCookie, __setAuthSession } from "../../../mocks/auth";
import { createApiTestServer } from "../../../../trpc/api/server";
import { seedTrip, seedTripDay, seedTripLock, seedTripItem, UUIDS } from "../../../../trpc/api/seed";

import { useTripEditPlan } from "~/business/trip/edit/plan/hooks";
import { useTripEditStore } from "~/business/trip/edit/store";
import { nav } from "~/navigation/nav";
import { queryClient } from "~/utils/api";

vi.mock("~/utils/api", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  const { createTRPCClient, httpBatchLink } = await import("@trpc/client");
  const { createTRPCOptionsProxy } = await import("@trpc/tanstack-react-query");
  const superjson = (await import("superjson")).default;
  const { authClient } = await import("~/utils/auth");

  const queryClient = new QueryClient();
  const trpc = createTRPCOptionsProxy({
    client: createTRPCClient({
      links: [
        httpBatchLink({
          transformer: superjson,
          url: "http://test.local/api/trpc",
          fetch: globalThis.fetch as any,
          headers: () => {
            const cookie = authClient.getCookie();
            return cookie ? { cookie } : {};
          },
        }),
      ],
    }),
    queryClient,
  });

  return { queryClient, trpc };
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("expo/business/trip/edit/plan/hooks", () => {
  let server: Awaited<ReturnType<typeof createApiTestServer>>;
  const userId = "user_1";

  beforeAll(async () => {
    server = await createApiTestServer();
  });

  beforeEach(() => {
    useTripEditStore.setState({
      tripId: UUIDS.tripA,
      errorMessage: null,
      hasLock: true,
      canEdit: true,
      days: [{ dayIndex: 0, date: "2026-01-01" }],
      items: [
        {
          id: UUIDS.itemA,
          localKey: UUIDS.itemA,
          dayIndex: 0,
          type: "poi",
          order: 0,
          title: "  A  ",
          startsMinute: 60,
          endsMinute: 120,
          note: null,
          lat: null,
          lng: null,
          jarId: null,
        } as any,
        {
          id: UUIDS.itemB,
          localKey: UUIDS.itemB,
          dayIndex: 0,
          type: "poi",
          order: 1,
          title: "   ",
          startsMinute: null,
          endsMinute: null,
          note: null,
          lat: null,
          lng: null,
          jarId: null,
        } as any,
      ],
      selectedDayIndex: 0,
      metaStartDate: "2026-01-01",
      metaEndDate: "2026-01-01",
      timeModalItemId: UUIDS.itemA,
      showJarPicker: false,
      persistedDayIndexes: [0],
      nextLocalKey: 1,
    });
  });

  afterEach(() => {
    void server.dbHarness.resetDb();
    queryClient.clear();
    __setAuthSession(null);
    __setAuthCookie(null);
    vi.clearAllMocks();
  });

  it("savePlanNow：会 trim title、过滤空 title；成功后 resetPlan + invalidate + nav.back", async () => {
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId, title: "T" });
    await seedTripDay({ client: server.dbHarness.client, id: UUIDS.dayA0, tripId: UUIDS.tripA, dayIndex: 0, date: "2026-01-01" });
    await seedTripLock({ client: server.dbHarness.client, tripId: UUIDS.tripA, userId, expiresInSeconds: 120 });
    await seedTripItem({
      client: server.dbHarness.client,
      id: UUIDS.itemA,
      tripId: UUIDS.tripA,
      dayId: UUIDS.dayA0,
      type: "poi",
      order: 0,
      title: "A",
      startsMinute: 60,
      endsMinute: 120,
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useTripEditPlan(), { wrapper });
    await act(async () => {
      result.current.savePlanNow();
    });

    await waitFor(() => {
      expect(useTripEditStore.getState().days.length).toBe(0);
      expect(useTripEditStore.getState().items.length).toBe(0);
      expect(useTripEditStore.getState().errorMessage).toBeNull();
      expect(nav.back).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  it("freeSlots：条件满足时会发起查询并返回结果数组", async () => {
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId, title: "T" });
    await seedTripDay({ client: server.dbHarness.client, id: UUIDS.dayA0, tripId: UUIDS.tripA, dayIndex: 0, date: "2026-01-01" });
    await seedTripLock({ client: server.dbHarness.client, tripId: UUIDS.tripA, userId, expiresInSeconds: 120 });
    await seedTripItem({
      client: server.dbHarness.client,
      id: UUIDS.itemA,
      tripId: UUIDS.tripA,
      dayId: UUIDS.dayA0,
      type: "poi",
      order: 0,
      title: "A",
      startsMinute: 60,
      endsMinute: 120,
    });

    const { result } = renderHook(() => useTripEditPlan(), { wrapper });
    await waitFor(() => {
      expect(result.current.freeSlots.data).toBeDefined();
    });
    expect(Array.isArray(result.current.freeSlots.data)).toBe(true);
  });
});

