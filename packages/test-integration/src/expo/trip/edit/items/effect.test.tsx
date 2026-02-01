import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTripEditStore } from "~/business/trip/edit/store";
import type { TripPlan } from "~/business/trip/edit/types";

vi.mock("~/utils/api", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  const queryClient = new QueryClient();
  return { queryClient };
});

vi.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void | (() => void)) => {
    // In tests, run focus effect immediately.
    cb();
  },
}));

vi.mock("~/utils/wishlist-location-draft", () => ({
  consumeWishlistLocationDraft: vi.fn(() => null),
}));

describe("expo/business/trip/edit/items/effect", () => {
  beforeEach(() => {
    // Reset store to a known state.
    const s = useTripEditStore.getState();
    s.setTripId(null);
    s.resetPlan();
    s.setSelectedDayIndex(null);
    s.setPersistedDayIndexes([]);
  });

  it("首次拿到 plan 时，会把 days/items hydrate 到 store（且只做一次）", async () => {
    const { useTripEditItemsSync } = await import("~/business/trip/edit/items/effect");

    const plan: TripPlan = {
      days: [
        {
          dayIndex: 0,
          date: "2026-01-01",
          items: [
            {
              id: "00000000-0000-0000-0000-000000000010",
              type: "poi",
              order: 0,
              title: "西湖",
              startsMinute: 60,
              endsMinute: 120,
              note: null,
              lat: 30.25,
              lng: 120.15,
              jarId: null,
            },
          ],
        },
      ],
      unassignedItems: [
        {
          id: "00000000-0000-0000-0000-000000000011",
          type: "poi",
          order: 0,
          title: "灵隐寺",
          startsMinute: null,
          endsMinute: null,
          note: null,
          lat: null,
          lng: null,
          jarId: null,
        },
      ],
    } as any;

    await act(async () => {
      renderHook(() => useTripEditItemsSync(plan));
      // Flush effects.
      await new Promise((r) => setTimeout(r, 0));
    });

    const st = useTripEditStore.getState();
    expect(st.days.length).toBe(1);
    expect(st.items.length).toBe(2);
    expect(st.selectedDayIndex).toBe(0);
    expect(st.persistedDayIndexes).toEqual([0]);

    // 再次 render 不应重复覆盖（因为 days/items 已经有数据）
    useTripEditStore.getState().setItems([{ localKey: "local_1", dayIndex: null, type: "poi", order: 0, title: "本地改动", startsMinute: null, endsMinute: null, note: null, lat: null, lng: null, jarId: null } as any]);
    renderHook(() => useTripEditItemsSync(plan));
    const st2 = useTripEditStore.getState();
    expect(st2.items.some((it) => it.title === "本地改动")).toBe(true);
  });
});

