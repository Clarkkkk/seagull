import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __setAuthCookie, __setAuthSession } from "../../mocks/auth";
import { createApiTestServer } from "../../../trpc/api/server";
import { __setNextLaunchResult, __setPermissionsGranted } from "expo-image-picker";

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
    __setPermissionsGranted(true);
    __setNextLaunchResult({ canceled: true, assets: [] });
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

  it("saveJar：新建时可先选图，保存后会把图片写入 jar 并可设置封面", async () => {
    await server.dbHarness.resetDb();

    // S3 env required by requestImageUpload (server-side presign).
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_REGION = "test-region";
    process.env.S3_ACCESS_KEY = "test-access";
    process.env.S3_SECRET_KEY = "test-secret";
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example";

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

    const baseFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === "file://mock-asset.jpg") {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      return await baseFetch(input, init);
    }) as typeof fetch;

    __setPermissionsGranted(true);

    // pick first image
    __setNextLaunchResult({
      canceled: false,
      assets: [{ uri: "file://mock-asset.jpg", width: 1200, height: 800, mimeType: "image/jpeg" }],
    });

    const { result } = renderHook(() => useWishlistNewJar(), { wrapper });
    await waitFor(() => expect(result.current.canSave).toBe(true));

    await act(async () => {
      await result.current.addImage();
    });
    await waitFor(() => expect(result.current.pendingImages.length).toBe(1));

    // pick second image
    __setNextLaunchResult({
      canceled: false,
      assets: [{ uri: "file://mock-asset.jpg", width: 1200, height: 800, mimeType: "image/jpeg" }],
    });
    await act(async () => {
      await result.current.addImage();
    });
    await waitFor(() => expect(result.current.pendingImages.length).toBe(2));

    // set cover as second
    await act(async () => {
      result.current.setCoverIndex(1);
    });

    await act(async () => {
      await result.current.saveJar();
    });

    await waitFor(() => {
      expect(nav.replaceToWishlistDetail).toHaveBeenCalledTimes(1);
    });

    const jarId = (nav.replaceToWishlistDetail as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0];
    expect(typeof jarId).toBe("string");

    const client = server.makeClient(userId);
    const images = await client.wishlist.listImages.query({ jarId: String(jarId) });
    expect(images.length).toBe(2);

    const jar = await client.wishlist.getById.query({ id: String(jarId) });
    expect(jar.jar.coverImageId).toBe(images[1]?.id);

    globalThis.fetch = baseFetch;
  });
});

