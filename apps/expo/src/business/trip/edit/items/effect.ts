import { useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { queryClient } from "~/utils/api";
import { consumeWishlistLocationDraft } from "~/utils/wishlist-location-draft";
import { useTripEditStore } from "../store";
import type { EditItem, TripPlan } from "../types";
import { normalizeOrders } from "../utils";

export function useTripEditItemsSync(plan: TripPlan | null = null) {
  const tripId = useTripEditStore((state) => state.tripId);
  const days = useTripEditStore((state) => state.days);
  const items = useTripEditStore((state) => state.items);
  const selectedDayIndex = useTripEditStore((state) => state.selectedDayIndex);
  const setDays = useTripEditStore((state) => state.setDays);
  const setItems = useTripEditStore((state) => state.setItems);
  const setSelectedDayIndex = useTripEditStore((state) => state.setSelectedDayIndex);
  const setPersistedDayIndexes = useTripEditStore((state) => state.setPersistedDayIndexes);
  const newLocalKey = useTripEditStore((state) => state.newLocalKey);

  useEffect(() => {
    // Business: hydrate local editable days/items from server plan once.
    if (!plan) return;
    if (days.length || items.length) return;

    const nextDays = plan.days.map((d) => ({
      dayIndex: d.dayIndex,
      date: d.date ?? null,
    }));

    const nextItems: EditItem[] = [
      ...plan.days.flatMap((d) =>
        d.items.map((it) => ({
          id: it.id,
          localKey: it.id,
          dayIndex: d.dayIndex,
          type: it.type as EditItem["type"],
          order: it.order,
          title: it.title,
          startsMinute: it.startsMinute ?? null,
          endsMinute: it.endsMinute ?? null,
          note: it.note ?? null,
          lat: it.lat ?? null,
          lng: it.lng ?? null,
          jarId: it.jarId ?? null,
        })),
      ),
      ...plan.unassignedItems.map((it) => ({
        id: it.id,
        localKey: it.id,
        dayIndex: null,
        type: it.type as EditItem["type"],
        order: it.order,
        title: it.title,
        startsMinute: it.startsMinute ?? null,
        endsMinute: it.endsMinute ?? null,
        note: it.note ?? null,
        lat: it.lat ?? null,
        lng: it.lng ?? null,
        jarId: it.jarId ?? null,
      })),
    ];

    setDays(nextDays);
    setItems(normalizeOrders(nextItems));
    setSelectedDayIndex(nextDays[0]?.dayIndex ?? null);
  }, [days.length, items.length, plan, setDays, setItems, setSelectedDayIndex]);

  useEffect(() => {
    // Business: track which days already exist on the server.
    if (!plan) return;
    setPersistedDayIndexes((plan.days ?? []).map((d) => d.dayIndex));
  }, [plan?.days, setPersistedDayIndexes]);

  useFocusEffect(
    useCallback(() => {
      // Business: consume wishlist draft when returning from map picker.
      if (!tripId) return;
      const draft = consumeWishlistLocationDraft(queryClient, `trip-${tripId}`);
      if (!draft) return;

      const dayIndex = selectedDayIndex ?? null;
      const next = normalizeOrders(items);
      const count = next.filter((it) => it.dayIndex === dayIndex).length;
      setItems([
        ...next,
        {
          localKey: newLocalKey(),
          dayIndex,
          type: "poi",
          order: count,
          title: draft.name ?? "未命名地点",
          startsMinute: null,
          endsMinute: null,
          note: draft.formattedAddress ?? null,
          lat: draft.lat,
          lng: draft.lng,
          jarId: null,
        },
      ]);
    }, [items, newLocalKey, selectedDayIndex, setItems, tripId]),
  );
}
