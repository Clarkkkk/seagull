import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { wishlistLocationDraftKey } from "~/utils/wishlist-location-draft";
import { useWishlistLocationDraft } from "~/business/wishlist/draft/hooks";
import { queryClient } from "~/utils/api";

vi.mock("~/utils/api", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  const queryClient = new QueryClient();
  return { queryClient };
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("expo/business/wishlist/draft/hooks", () => {
  afterEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
  });

  it("能读取 queryClient 中已写入的 draft（enabled=false 但会返回 cached data）", () => {
    queryClient.setQueryData(wishlistLocationDraftKey("k1"), {
      lat: 30.2741,
      lng: 120.1551,
      name: "西湖",
      formattedAddress: "Hangzhou, Zhejiang, China",
    });

    const { result } = renderHook(() => useWishlistLocationDraft("k1"), { wrapper });
    expect(result.current.data?.name).toBe("西湖");
  });
});

