import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { __setAuthCookie, __setAuthSession } from "../../mocks/auth";
import { createApiTestServer } from "../../../trpc/api/server";
import { seedWishlistJar, UUIDS } from "../../../trpc/api/seed";

import { useWishlistJar } from "~/business/wishlist/detail/hooks";
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

describe("expo/business/wishlist/detail/hooks", () => {
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

  it("statusLabel + badgeVariant：inactive/in_trip/archived 映射正确", async () => {
    const userId = "user_1";
    __setAuthSession({ user: { id: userId } }, { isPending: false });
    __setAuthCookie(`x-test-user-id=${encodeURIComponent(userId)}`);

    await seedWishlistJar({
      client: server.dbHarness.client,
      id: UUIDS.jarA,
      userId,
      status: "inactive",
      name: "A",
      country: "CN",
      province: "ZJ",
      city: "HZ",
      lat: 30,
      lng: 120,
    });

    const { result, rerender } = renderHook(({ jarId }: { jarId: string }) => useWishlistJar(jarId), {
      wrapper,
      initialProps: { jarId: UUIDS.jarA },
    });

    await waitFor(() => expect(result.current.jar?.id).toBe(UUIDS.jarA));
    expect(result.current.statusLabel).toBe("未加入行程");
    expect(result.current.badgeVariant).toBe("default");

    await server.dbHarness.client.exec(`UPDATE wishlist_jar SET status='in_trip' WHERE id='${UUIDS.jarA}';`);
    queryClient.invalidateQueries();
    rerender({ jarId: UUIDS.jarA });
    await waitFor(() => expect(result.current.statusLabel).toBe("行程中"));
    expect(result.current.badgeVariant).toBe("success");

    await server.dbHarness.client.exec(`UPDATE wishlist_jar SET status='archived' WHERE id='${UUIDS.jarA}';`);
    queryClient.invalidateQueries();
    rerender({ jarId: UUIDS.jarA });
    await waitFor(() => expect(result.current.statusLabel).toBe("已归档"));
    expect(result.current.badgeVariant).toBe("muted");
  });
});

