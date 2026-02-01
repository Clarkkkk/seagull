import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __setAuthCookie, __setAuthSession } from "../../../mocks/auth";
import { createApiTestServer } from "../../../../trpc/api/server";
import { seedWishlistJar, UUIDS } from "../../../../trpc/api/seed";

import { useTripEditJars } from "~/business/trip/edit/jars/hooks";
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

describe("expo/business/trip/edit/jars/hooks", () => {
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

  it("未登录：enabled=false，返回空 jars", () => {
    __setAuthSession(null, { isPending: false });
    __setAuthCookie(null);

    const { result } = renderHook(() => useTripEditJars(), { wrapper });
    expect(result.current.jars).toEqual([]);
  });

  it("已登录：能拿到 wishlist.list 数据作为 jars", async () => {
    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    await seedWishlistJar({
      client: server.dbHarness.client,
      id: UUIDS.jarA,
      userId,
      name: "A",
      country: "CN",
      province: "ZJ",
      city: "HZ",
      lat: 30,
      lng: 120,
      status: "inactive",
    });

    const { result } = renderHook(() => useTripEditJars(), { wrapper });
    await waitFor(() => expect(result.current.jars.length).toBeGreaterThan(0));
    expect(result.current.jars.some((j) => j.id === UUIDS.jarA)).toBe(true);
  });
});

