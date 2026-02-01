import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __setAuthCookie, __setAuthSession } from "../../mocks/auth";
import { createApiTestServer } from "../../../trpc/api/server";
import { seedWishlistJar, UUIDS } from "../../../trpc/api/seed";

import { wishlistLocationDraftKey } from "~/utils/wishlist-location-draft";
import { nav } from "~/navigation/nav";
import { useWishlistEditJar } from "~/business/wishlist/edit/hooks";
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

describe("expo/business/wishlist/edit/hooks", () => {
  let server: Awaited<ReturnType<typeof createApiTestServer>>;

  beforeAll(async () => {
    server = await createApiTestServer();
  });

  afterEach(() => {
    void server.dbHarness.resetDb();
    queryClient.clear();
    __setAuthSession(null);
    __setAuthCookie(null);
    vi.clearAllMocks();
  });

  it("jarQuery 拉到数据后，会填充 name/note；saveJar 成功会 invalidate + nav.back", async () => {
    await server.dbHarness.resetDb();

    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    await seedWishlistJar({
      client: server.dbHarness.client,
      id: UUIDS.jarA,
      userId,
      name: "杭州想去",
      country: "China",
      province: "Zhejiang",
      city: "Hangzhou",
      lat: 30.2741,
      lng: 120.1551,
      status: "inactive",
    });

    // 模拟用户从 picker 回来选了新地点
    queryClient.setQueryData(wishlistLocationDraftKey(UUIDS.jarA), {
      lat: 30.3,
      lng: 120.2,
      name: "灵隐寺",
      formattedAddress: "Lingyin Temple, Hangzhou, China",
      placeProvider: "mapbox",
      placeId: "poi.1",
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useWishlistEditJar(UUIDS.jarA), { wrapper });

    await waitFor(() => {
      expect(result.current.jar?.id).toBe(UUIDS.jarA);
    });

    // 初始填充来自 jar（或 draft），至少应该有有效 name
    await waitFor(() => expect(result.current.effectiveName.length).toBeGreaterThan(0));
    expect(result.current.canSave).toBe(true);

    await act(async () => {
      result.current.saveJar();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
      expect(nav.back).toHaveBeenCalledTimes(1);
    });
  });
});

