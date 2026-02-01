import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useTripEditMetaSync } from "~/business/trip/edit/meta/effect";
import { useTripEditStore } from "~/business/trip/edit/store";

describe("expo/business/trip/edit/meta/effect", () => {
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

  it("tripMeta 存在时，会把 start/end 写入 store（null -> 空字符串）", async () => {
    await act(async () => {
      renderHook(() =>
        useTripEditMetaSync({
          title: "T",
          startDate: "2026-01-01",
          endDate: null,
        } as any),
      );
    });

    const st = useTripEditStore.getState();
    expect(st.metaStartDate).toBe("2026-01-01");
    expect(st.metaEndDate).toBe("");
  });
});

