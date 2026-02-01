import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient, trpc } from "~/utils/api";
import { nav } from "~/navigation/nav";
import { useTripEditStore } from "../store";
import type { EditItem } from "../types";
import { normalizeOrders } from "../utils";

export function useTripEditPlan() {
  const tripId = useTripEditStore((state) => state.tripId);
  const days = useTripEditStore((state) => state.days);
  const items = useTripEditStore((state) => state.items);
  const selectedDayIndex = useTripEditStore((state) => state.selectedDayIndex);
  const timeModalItemId = useTripEditStore((state) => state.timeModalItemId);
  const canEdit = useTripEditStore((state) => state.canEdit);
  const persistedDayIndexes = useTripEditStore((state) => state.persistedDayIndexes);
  const resetPlan = useTripEditStore((state) => state.resetPlan);
  const setErrorMessage = useTripEditStore((state) => state.setErrorMessage);

  const optimizePlan = useMutation(
    trpc.trip.plan.optimize.mutationOptions({
      onSuccess: async () => {
        resetPlan();
        await queryClient.invalidateQueries(trpc.trip.getById.queryFilter({ id: tripId ?? "" }));
      },
    }),
  );

  const savePlan = useMutation(
    trpc.trip.plan.save.mutationOptions({
      onSuccess: async () => {
        setErrorMessage(null);
        resetPlan();
        await queryClient.invalidateQueries(trpc.trip.getById.queryFilter({ id: tripId ?? "" }));
        await queryClient.invalidateQueries(trpc.trip.snapshots.list.queryFilter({ tripId: tripId ?? "" }));
        nav.back();
      },
      onError: (err) => {
        setErrorMessage(err.message);
      },
    }),
  );

  const timeItem = useMemo(() => {
    // Business: bind time picker to the active item.
    if (!timeModalItemId) return null;
    return items.find((it) => it.localKey === timeModalItemId) ?? null;
  }, [items, timeModalItemId]);

  const freeSlots = useQuery(
    trpc.trip.plan.getFreeSlots.queryOptions(
      {
        tripId: tripId ?? "",
        dayIndex: selectedDayIndex ?? 0,
        excludeItemId: timeItem?.id,
      },
      {
        enabled:
          canEdit &&
          !!tripId &&
          selectedDayIndex !== null &&
          persistedDayIndexes.includes(selectedDayIndex) &&
          !!timeModalItemId,
      },
    ),
  );

  const optimizePlanNow = () => {
    // Business: request a best-effort schedule for unscheduled items.
    if (!tripId) return;
    optimizePlan.mutate({
      tripId: tripId ?? "",
      scope: "onlyUnscheduled",
      daysCount: days.length ? undefined : 3,
    });
  };

  const savePlanNow = () => {
    // Business: normalize items before saving and return to previous screen.
    if (!tripId) return;
    const normalized = normalizeOrders(items)
      .map((it) => ({ ...it, title: it.title.trim() }))
      .filter((it) => it.title);
    savePlan.mutate({
      tripId: tripId ?? "",
      days,
      items: normalized.map((it: EditItem) => ({
        id: it.id,
        dayIndex: it.dayIndex,
        type: it.type,
        order: it.order,
        title: it.title,
        startsMinute: it.startsMinute,
        endsMinute: it.endsMinute,
        note: it.note,
        lat: it.lat,
        lng: it.lng,
        jarId: it.jarId,
      })),
    });
  };

  return {
    optimizePlan,
    savePlan,
    timeItem,
    persistedDayIndexes,
    freeSlots,
    optimizePlanNow,
    savePlanNow,
  };
}
