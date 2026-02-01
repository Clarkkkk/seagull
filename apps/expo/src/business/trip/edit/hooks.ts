import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { useTripEditStore } from "./store";
import { useTripEditLock } from "./locks/hooks";
import { useTripEditMetaSync } from "./meta/effect";
import { useTripEditItemsSync } from "./items/effect";
import { useTripEditLockEffect } from "./locks/effect";

export function useTripEditBusiness(tripId: string | null) {
  const setTripId = useTripEditStore((state) => state.setTripId);
  const errorMessage = useTripEditStore((state) => state.errorMessage);

  useEffect(() => {
    // Business: keep store tripId in sync with route params.
    setTripId(tripId ?? null);
  }, [setTripId, tripId]);

  // Business: lock + auth are orchestrated here to avoid duplicate side effects.
  const { isAuthed, userId, lockInfo, sessionLoading } = useTripEditLock(tripId ?? null);

  const { data } = useQuery(
    trpc.trip.getById.queryOptions(
      { id: tripId ?? "" },
      { enabled: isAuthed && !!tripId && !sessionLoading },
    ),
  );

  useTripEditMetaSync(data?.trip ?? null);
  useTripEditItemsSync(data?.plan ?? null);
  useTripEditLockEffect({
    tripId: tripId ?? null,
    isAuthed,
    userId: userId ?? null,
    lockInfo,
  });

  return {
    tripId: tripId ?? null,
    data,
    isAuthed,
    userId,
    lockInfo,
    errorMessage,
    sessionLoading,
  };
}
