import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";

import { queryClient, trpc } from "~/utils/api";
import { nav } from "~/navigation/nav";
import { useTripEditStore } from "../store";
import type { EditItem } from "../types";
import { normalizeOrders } from "../utils";

export function useTripEditItems() {
  const tripId = useTripEditStore((state) => state.tripId);
  const items = useTripEditStore((state) => state.items);
  const selectedDayIndex = useTripEditStore((state) => state.selectedDayIndex);
  const setItems = useTripEditStore((state) => state.setItems);
  const updateItems = useTripEditStore((state) => state.updateItems);
  const setTimeModalItemId = useTripEditStore((state) => state.setTimeModalItemId);
  const setErrorMessage = useTripEditStore((state) => state.setErrorMessage);
  const resetPlan = useTripEditStore((state) => state.resetPlan);
  const newLocalKey = useTripEditStore((state) => state.newLocalKey);
  const canEdit = useTripEditStore((state) => state.canEdit);
  const persistedDayIndexes = useTripEditStore((state) => state.persistedDayIndexes);

  const reorderItems = useMutation(
    trpc.trip.plan.reorderItems.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.trip.getById.queryFilter({ id: tripId ?? "" }));
      },
    }),
  );

  const moveItem = useMutation(
    trpc.trip.plan.moveItem.mutationOptions({
      onSuccess: async () => {
        resetPlan();
        await queryClient.invalidateQueries(trpc.trip.getById.queryFilter({ id: tripId ?? "" }));
      },
    }),
  );

  const selectedItems = useMemo(() => {
    // Business: derive the editable list for the active day.
    return items.filter((it) => it.dayIndex === selectedDayIndex).sort((a, b) => a.order - b.order);
  }, [items, selectedDayIndex]);

  const unassignedItems = useMemo(() => {
    // Business: keep the pending bucket sorted by order.
    return items.filter((it) => it.dayIndex === null).sort((a, b) => a.order - b.order);
  }, [items]);

  const usedJarIds = useMemo(() => {
    // Business: prevent adding duplicated jars.
    return new Set(items.map((it) => it.jarId).filter(Boolean) as string[]);
  }, [items]);

  const addItemFromJar = (jar: {
    id: string;
    name: string;
    formattedAddress?: string | null;
    lat: number | null;
    lng: number | null;
  }) => {
    // Business: insert jar item into current day (or pending bucket).
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
        title: jar.name,
        startsMinute: null,
        endsMinute: null,
        note: jar.formattedAddress ?? null,
        lat: jar.lat,
        lng: jar.lng,
        jarId: jar.id,
      },
    ]);
  };

  const addEmptyItem = () => {
    // Business: create a blank note item for the active day.
    if (selectedDayIndex === null) return;
    const next = normalizeOrders(items);
    const count = next.filter((it) => it.dayIndex === selectedDayIndex).length;
    setItems([
      ...next,
      {
        localKey: newLocalKey(),
        dayIndex: selectedDayIndex,
        type: "note",
        order: count,
        title: "",
        startsMinute: null,
        endsMinute: null,
        note: null,
        lat: null,
        lng: null,
        jarId: null,
      },
    ]);
  };

  const updateItemTitle = (localKey: string, title: string) => {
    // Business: update title inline without trimming (trim on save).
    updateItems((prev) => prev.map((x) => (x.localKey === localKey ? { ...x, title } : x)));
  };

  const updateItemNote = (localKey: string, note: string) => {
    // Business: normalize empty note to null.
    updateItems((prev) =>
      prev.map((x) => (x.localKey === localKey ? { ...x, note: note.trim() ? note : null } : x)),
    );
  };

  const removeItem = (localKey: string) => {
    // Business: delete local-only items immediately.
    updateItems((prev) => prev.filter((x) => x.localKey !== localKey));
  };

  const setItemTimeRange = (localKey: string, startsMinute: number, endsMinute: number) => {
    // Business: apply time range to item.
    updateItems((prev) =>
      prev.map((x) => (x.localKey === localKey ? { ...x, startsMinute, endsMinute } : x)),
    );
  };

  const clearItemTimeRange = (localKey: string) => {
    // Business: reset time range.
    updateItems((prev) =>
      prev.map((x) =>
        x.localKey === localKey ? { ...x, startsMinute: null, endsMinute: null } : x,
      ),
    );
  };

  const openTimePicker = (localKey: string) => {
    // Business: allow time editing only on persisted days.
    if (!canEdit) return;
    if (selectedDayIndex === null || !persistedDayIndexes.includes(selectedDayIndex)) {
      setErrorMessage("请先保存当前 Day，再设置时间段。");
      return;
    }
    setTimeModalItemId(localKey);
  };

  const openMapPicker = () => {
    // Business: open map picker modal.
    if (!tripId) return;
    nav.openPickLocation({ draftKey: `trip-${tripId}` });
  };

  const moveItemToUnassigned = (item: EditItem) => {
    // Business: local move for unsaved items, server mutation for persisted ones.
    if (!tripId) return;
    if (!item.id) {
      setItems(
        normalizeOrders(items.map((x) => (x.localKey === item.localKey ? { ...x, dayIndex: null } : x))),
      );
      return;
    }
    moveItem.mutate({ tripId: tripId ?? "", itemId: item.id, targetDayIndex: null });
  };

  const moveUnassignedToDay = (item: EditItem) => {
    // Business: assign pending items into active day.
    if (selectedDayIndex === null) return;
    if (item.id && tripId) {
      moveItem.mutate({
        tripId: tripId ?? "",
        itemId: item.id,
        targetDayIndex: selectedDayIndex,
      });
      return;
    }
    setItems(
      normalizeOrders(
        items.map((x) => (x.localKey === item.localKey ? { ...x, dayIndex: selectedDayIndex } : x)),
      ),
    );
  };

  const reorderSelectedItems = (nextItems: EditItem[]) => {
    // Business: reorder locally, then sync if all ids are persisted.
    if (selectedDayIndex === null) return;
    const dayItems = nextItems.map((it, idx) => ({ ...it, order: idx }));
    const other = items.filter((it) => it.dayIndex !== selectedDayIndex);
    setItems(normalizeOrders([...other, ...dayItems]));

    const ids = dayItems.map((it) => it.id).filter(Boolean) as string[];
    if (canEdit && tripId && ids.length === dayItems.length) {
      reorderItems.mutate({ tripId: tripId ?? "", dayIndex: selectedDayIndex, orderedItemIds: ids });
    }
  };

  return {
    selectedItems,
    unassignedItems,
    persistedDayIndexes,
    usedJarIds,
    addItemFromJar,
    addEmptyItem,
    updateItemTitle,
    updateItemNote,
    removeItem,
    setItemTimeRange,
    clearItemTimeRange,
    openTimePicker,
    openMapPicker,
    moveItemToUnassigned,
    moveUnassignedToDay,
    reorderSelectedItems,
  };
}
