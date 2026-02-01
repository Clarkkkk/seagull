import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __setAuthCookie, __setAuthSession } from "../../mocks/auth";
import { createApiTestServer } from "../../../trpc/api/server";

import { wishlistLocationDraftKey } from "~/utils/wishlist-location-draft";
import { nav } from "~/navigation/nav";
import { useWishlistNewJar } from "~/business/wishlist/new/hooks";
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

describe("expo/business/wishlist/new/hooks", () => {
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

  it("pickedLocation.name 存在且 name 为空时，会自动填充 name", async () => {
    queryClient.setQueryData(wishlistLocationDraftKey("new"), {
      lat: 30.2741,
      lng: 120.1551,
      name: "西湖",
      formattedAddress: "Hangzhou, Zhejiang, China",
      placeProvider: "mapbox",
      placeId: "place.1",
    });

    const { result } = renderHook(() => useWishlistNewJar(), { wrapper });

    await waitFor(() => {
      expect(result.current.name).toBe("西湖");
    });
  });

  it("saveJar：会调用 wishlist.create，success 后 invalidate list + nav.replaceToWishlistDetail", async () => {
    await server.dbHarness.resetDb();

    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    queryClient.setQueryData(wishlistLocationDraftKey("new"), {
      lat: 30.2741,
      lng: 120.1551,
      name: "西湖",
      formattedAddress: "Hangzhou, Zhejiang, China",
      placeProvider: "mapbox",
      placeId: "place.1",
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useWishlistNewJar(), { wrapper });
    await waitFor(() => expect(result.current.canSave).toBe(true));

    await act(async () => {
      result.current.saveJar();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
      expect(nav.replaceToWishlistDetail).toHaveBeenCalledTimes(1);
    });

    const jarId = (nav.replaceToWishlistDetail as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0];
    expect(typeof jarId).toBe("string");
  });
});

