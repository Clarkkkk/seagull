import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useTripEditDays } from "~/business/trip/edit/days/hooks";
import { useTripEditStore } from "~/business/trip/edit/store";

describe("expo/business/trip/edit/days/hooks", () => {
  beforeEach(() => {
    useTripEditStore.setState({
      tripId: null,
      errorMessage: null,
      hasLock: false,
      canEdit: false,
      days: [],
      items: [],
      selectedDayIndex: null,
      metaStartDate: "",
      metaEndDate: "",
      timeModalItemId: null,
      showJarPicker: false,
      persistedDayIndexes: [],
      nextLocalKey: 1,
    });
  });

  it("addDay：空列表时插入 dayIndex=0 并选中", () => {
    const { result } = renderHook(() => useTripEditDays());
    result.current.addDay();
    const st = useTripEditStore.getState();
    expect(st.days.map((d) => d.dayIndex)).toEqual([0]);
    expect(st.selectedDayIndex).toBe(0);
  });

  it("addDay：存在非连续 dayIndex 时，用 max+1", () => {
    useTripEditStore.getState().setDays([
      { dayIndex: 0, date: null },
      { dayIndex: 2, date: null },
    ]);
    const { result } = renderHook(() => useTripEditDays());
    result.current.addDay();
    const st = useTripEditStore.getState();
    expect(st.days.map((d) => d.dayIndex)).toEqual([0, 2, 3]);
    expect(st.selectedDayIndex).toBe(3);
  });
});

