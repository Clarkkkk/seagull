import { useEffect } from "react";

import type { TripMeta } from "../types";
import { useTripEditStore } from "../store";

export function useTripEditMetaSync(tripMeta: TripMeta | null) {
  const setMetaStartDate = useTripEditStore((state) => state.setMetaStartDate);
  const setMetaEndDate = useTripEditStore((state) => state.setMetaEndDate);

  useEffect(() => {
    // Business: keep editable meta range in sync with server payload.
    if (!tripMeta) return;
    setMetaStartDate(tripMeta.startDate ?? "");
    setMetaEndDate(tripMeta.endDate ?? "");
  }, [setMetaEndDate, setMetaStartDate, tripMeta?.endDate, tripMeta?.startDate]);
}
