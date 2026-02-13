import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
// @ts-expect-error mocked module
import { __setNextLaunchResult, __setPermissionsGranted } from "expo-image-picker";
import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { __setAuthCookie, __setAuthSession } from "../../mocks/auth";
import { createApiTestServer } from "../../../trpc/api/server";
import { seedWishlistJar, UUIDS } from "../../../trpc/api/seed";

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

describe("expo/business/wishlist/images/hooks", () => {
  let server: Awaited<ReturnType<typeof createApiTestServer>>;
  let baseFetch: typeof fetch;

  beforeAll(async () => {
    server = await createApiTestServer();
  });

  beforeEach(() => {
    baseFetch = globalThis.fetch;
  });

  afterEach(() => {
    void server.dbHarness.resetDb();
    queryClient.clear();
    __setAuthSession(null);
    __setAuthCookie(null);
    __setPermissionsGranted(true);
    __setNextLaunchResult({ canceled: true, assets: [] });
    vi.clearAllMocks();
    globalThis.fetch = baseFetch;
  });

  it("isFull 会在图片达到 9 张后变为 true", async () => {
    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId, status: "inactive" });
    const client = server.makeClient(userId);

    for (let i = 0; i < 9; i += 1) {
      await client.wishlist.confirmImageUpload.mutate({
        jarId: UUIDS.jarA,
        key: `link:${i}`,
        url: `https://img.example/${i}.jpg`,
      });
    }

    const { useWishlistJarImages } = await import("~/business/wishlist/images/hooks");
    const { result } = renderHook(() => useWishlistJarImages(UUIDS.jarA), { wrapper });
    await waitFor(() => expect(result.current.images.length).toBe(9));
    expect(result.current.isFull).toBe(true);
  });

  it("pickAndUpload: 权限被拒绝时返回 permission", async () => {
    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId, status: "inactive" });

    __setPermissionsGranted(false);

    const { useWishlistJarImages } = await import("~/business/wishlist/images/hooks");
    const { result } = renderHook(() => useWishlistJarImages(UUIDS.jarA), { wrapper });
    const res = await result.current.pickAndUpload("image");
    expect(res).toEqual({ ok: false, reason: "permission" });
  });

  it("pickAndUpload: 选择取消时返回 canceled", async () => {
    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId, status: "inactive" });

    __setPermissionsGranted(true);
    __setNextLaunchResult({ canceled: true, assets: [] });

    const { useWishlistJarImages } = await import("~/business/wishlist/images/hooks");
    const { result } = renderHook(() => useWishlistJarImages(UUIDS.jarA), { wrapper });
    const res = await result.current.pickAndUpload("image");
    expect(res).toEqual({ ok: false, reason: "canceled" });
  });

  it("pickAndUpload: 成功路径会上传并触发 invalidate", async () => {
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_REGION = "test-region";
    process.env.S3_ACCESS_KEY = "test-access";
    process.env.S3_SECRET_KEY = "test-secret";
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example";

    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);
    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId, status: "inactive" });

    __setPermissionsGranted(true);
    __setNextLaunchResult({
      canceled: false,
      assets: [
        {
          uri: "file://mock-asset.jpg",
          width: 1200,
          height: 800,
          mimeType: "image/jpeg",
        },
      ],
    });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url === "file://mock-asset.jpg") {
        return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
      }
      if (url.startsWith("https://test-bucket.s3.test-region.amazonaws.com/")) {
        // S3 presigned PUT URL (upload)
        return new Response(null, { status: 200 });
      }
      if (url.startsWith("https://cdn.example/")) {
        return new Response(null, { status: 200 });
      }
      return await baseFetch(input, init);
    }) as typeof fetch;

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { useWishlistJarImages } = await import("~/business/wishlist/images/hooks");
    const { result } = renderHook(() => useWishlistJarImages(UUIDS.jarA), { wrapper });
    const res = await result.current.pickAndUpload("image");

    expect(res).toEqual({ ok: true });
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  it("setCoverFromImage + deleteJarImage 后封面回退到第一张", async () => {
    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId, status: "inactive" });
    const client = server.makeClient(userId);

    const first = await client.wishlist.confirmImageUpload.mutate({
      jarId: UUIDS.jarA,
      key: "link:first",
      url: "https://img.example/1.jpg",
    });
    const second = await client.wishlist.confirmImageUpload.mutate({
      jarId: UUIDS.jarA,
      key: "link:second",
      url: "https://img.example/2.jpg",
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { useWishlistJarImages } = await import("~/business/wishlist/images/hooks");
    const { result } = renderHook(() => useWishlistJarImages(UUIDS.jarA), { wrapper });
    await waitFor(() => expect(result.current.images.length).toBe(2));

    await act(async () => {
      await result.current.setCoverFromImage(second!.id);
    });

    const withCover = await client.wishlist.getById.query({ id: UUIDS.jarA });
    expect(withCover.jar.coverImageId).toBe(second!.id);

    await act(async () => {
      await result.current.deleteJarImage(second!.id);
    });

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled());
    const afterDelete = await client.wishlist.getById.query({ id: UUIDS.jarA });
    expect(afterDelete.jar.coverImageId).toBe(first!.id);
  });

  it("clearCoverImage 会清除封面并回退到第一张", async () => {
    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    await seedWishlistJar({ client: server.dbHarness.client, id: UUIDS.jarA, userId, status: "inactive" });
    const client = server.makeClient(userId);

    const first = await client.wishlist.confirmImageUpload.mutate({
      jarId: UUIDS.jarA,
      key: "link:first",
      url: "https://img.example/1.jpg",
    });
    const second = await client.wishlist.confirmImageUpload.mutate({
      jarId: UUIDS.jarA,
      key: "link:second",
      url: "https://img.example/2.jpg",
    });

    const { useWishlistJarImages } = await import("~/business/wishlist/images/hooks");
    const { result } = renderHook(() => useWishlistJarImages(UUIDS.jarA), { wrapper });
    await waitFor(() => expect(result.current.images.length).toBe(2));

    await act(async () => {
      await result.current.setCoverFromImage(second!.id);
    });

    await act(async () => {
      await result.current.clearCoverImage();
    });

    const afterClear = await client.wishlist.getById.query({ id: UUIDS.jarA });
    expect(afterClear.jar.coverImageId).toBe(first!.id);
  });
});
