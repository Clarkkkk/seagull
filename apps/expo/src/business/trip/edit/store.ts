import { create } from "zustand";

import type { EditDay, EditItem } from "./types";

type TripEditState = {
  tripId: string | null;
  errorMessage: string | null;
  hasLock: boolean;
  canEdit: boolean;
  days: EditDay[];
  items: EditItem[];
  selectedDayIndex: number | null;
  metaStartDate: string;
  metaEndDate: string;
  timeModalItemId: string | null;
  showJarPicker: boolean;
  persistedDayIndexes: number[];
  nextLocalKey: number;
};

type TripEditActions = {
  setTripId: (tripId: string | null) => void;
  setErrorMessage: (errorMessage: string | null) => void;
  setHasLock: (hasLock: boolean) => void;
  setCanEdit: (canEdit: boolean) => void;
  setDays: (days: EditDay[]) => void;
  setItems: (items: EditItem[]) => void;
  updateItems: (updater: (items: EditItem[]) => EditItem[]) => void;
  setSelectedDayIndex: (selectedDayIndex: number | null) => void;
  setMetaStartDate: (metaStartDate: string) => void;
  setMetaEndDate: (metaEndDate: string) => void;
  setTimeModalItemId: (timeModalItemId: string | null) => void;
  setShowJarPicker: (showJarPicker: boolean) => void;
  setPersistedDayIndexes: (persistedDayIndexes: number[]) => void;
  resetPlan: () => void;
  newLocalKey: () => string;
};

const initialState: TripEditState = {
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
};

export const useTripEditStore = create<TripEditState & TripEditActions>((set, get) => ({
  ...initialState,
  setTripId: (tripId) => set({ tripId }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setHasLock: (hasLock) => set({ hasLock }),
  setCanEdit: (canEdit) => set({ canEdit }),
  setDays: (days) => set({ days }),
  setItems: (items) => set({ items }),
  updateItems: (updater) => set((state) => ({ items: updater(state.items) })),
  setSelectedDayIndex: (selectedDayIndex) => set({ selectedDayIndex }),
  setMetaStartDate: (metaStartDate) => set({ metaStartDate }),
  setMetaEndDate: (metaEndDate) => set({ metaEndDate }),
  setTimeModalItemId: (timeModalItemId) => set({ timeModalItemId }),
  setShowJarPicker: (showJarPicker) => set({ showJarPicker }),
  setPersistedDayIndexes: (persistedDayIndexes) => set({ persistedDayIndexes }),
  resetPlan: () =>
    set({
      days: [],
      items: [],
      selectedDayIndex: null,
      persistedDayIndexes: [],
    }),
  newLocalKey: () => {
    const current = get().nextLocalKey;
    set({ nextLocalKey: current + 1 });
    return `local_${current}`;
  },
}));
