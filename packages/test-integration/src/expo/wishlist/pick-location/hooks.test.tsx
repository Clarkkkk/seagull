import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __setAuthCookie, __setAuthSession } from "../../mocks/auth";
import { createApiTestServer } from "../../../trpc/api/server";

import { wishlistLocationDraftKey } from "~/utils/wishlist-location-draft";
import { useWishlistPickLocation } from "~/business/wishlist/pick-location/hooks";
import { queryClient } from "~/utils/api";
import { nav } from "~/navigation/nav";

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

describe("expo/business/wishlist/pick-location/hooks", () => {
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

  it("debounce 500ms 后触发 search，并返回 candidates", async () => {
    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    const { result } = renderHook(
      () =>
        useWishlistPickLocation({
          draftKey: "k1",
          initialLat: 30.2741,
          initialLng: 120.1551,
        }),
      { wrapper },
    );

    expect(result.current.searchEnabled).toBe(false);

    await act(async () => {
      result.current.setQuery("coffee");
    });

    await waitFor(() => {
      expect(result.current.searchEnabled).toBe(true);
      expect(result.current.candidates.length).toBeGreaterThan(0);
    });
  });

  it("confirm：若 selected 缺少 country/province/city，会 reverseGeocode 后写入 draft 并返回上一页", async () => {
    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    const navigation = {
      canGoBack: () => true,
      goBack: vi.fn(),
    } as any;

    const { result } = renderHook(
      () =>
        useWishlistPickLocation({
          navigation,
          draftKey: "k2",
          initialLat: 30.2741,
          initialLng: 120.1551,
        }),
      { wrapper },
    );

    // Ensure missing address fields so confirm must reverseGeocode.
    await act(async () => {
      result.current.setSelected({ lat: 30.2741, lng: 120.1551 });
    });

    await act(async () => {
      await result.current.confirm();
    });

    const draft = queryClient.getQueryData<any>(wishlistLocationDraftKey("k2"));
    expect(draft?.lat).toBeCloseTo(30.2741);
    expect(draft?.country).toBeTruthy();
    expect(draft?.province).toBeTruthy();
    expect(draft?.city).toBeTruthy();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(nav.back).not.toHaveBeenCalled();
  });
});

