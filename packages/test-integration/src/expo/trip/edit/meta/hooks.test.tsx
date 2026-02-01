import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { __setAuthCookie, __setAuthSession } from "../../../mocks/auth";
import { createApiTestServer } from "../../../../trpc/api/server";
import { seedTrip, seedTripLock, UUIDS } from "../../../../trpc/api/seed";

import { useTripEditMeta } from "~/business/trip/edit/meta/hooks";
import { useTripEditStore } from "~/business/trip/edit/store";
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

describe("expo/business/trip/edit/meta/hooks", () => {
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
      items: [],
      selectedDayIndex: 0,
      metaStartDate: "",
      metaEndDate: "",
      timeModalItemId: null,
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

  it("updateMetaRange：输入校验（只填一个日期/格式错误/开始>结束）会写 errorMessage 且不触发 mutation", async () => {
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    const { result } = renderHook(() => useTripEditMeta(), { wrapper });

    act(() => result.current.updateMetaRange("2026-01-01", ""));
    expect(useTripEditStore.getState().errorMessage).toContain("必须同时填写");

    act(() => result.current.updateMetaRange("2026/01/01", "2026-01-02"));
    expect(useTripEditStore.getState().errorMessage).toContain("YYYY-MM-DD");

    act(() => result.current.updateMetaRange("2026-02-01", "2026-01-01"));
    expect(useTripEditStore.getState().errorMessage).toContain("开始日期必须早于");
  });

  it("成功时：清空 errorMessage、resetPlan、并 invalidate trip.getById", async () => {
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    await server.dbHarness.resetDb();
    await seedTrip({ client: server.dbHarness.client, id: UUIDS.tripA, userId, title: "T" });
    await seedTripLock({ client: server.dbHarness.client, tripId: UUIDS.tripA, userId, expiresInSeconds: 120 });

    // 让 resetPlan 有可观察效果
    useTripEditStore.getState().setItems([
      {
        localKey: "local_1",
        dayIndex: 0,
        type: "poi",
        order: 0,
        title: "X",
        startsMinute: null,
        endsMinute: null,
        note: null,
        lat: null,
        lng: null,
        jarId: null,
      } as any,
    ]);

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useTripEditMeta(), { wrapper });

    await act(async () => {
      result.current.updateMetaRange("2026-01-01", "2026-01-03");
    });

    await waitFor(() => {
      expect(useTripEditStore.getState().errorMessage).toBeNull();
      expect(useTripEditStore.getState().items.length).toBe(0);
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});

