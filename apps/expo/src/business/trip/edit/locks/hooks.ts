import { useQuery } from "@tanstack/react-query";

import { useAuthSession } from "~/business/auth/hooks";
import { trpc } from "~/utils/api";

export function useTripEditLock(tripId: string | null) {
  const { isAuthed, userId, session, isLoading: sessionLoading } = useAuthSession();

  const lockQuery = useQuery(
    trpc.trip.lock.get.queryOptions(
      { tripId: tripId ?? "" },
      { enabled: isAuthed && !!tripId && !sessionLoading },
    ),
  );

  const lockInfo = lockQuery.data;
  const derivedCanEdit = !!userId && !!lockInfo && lockInfo.userId === userId && !lockInfo.isExpired;

  return {
    isAuthed,
    userId,
    lockInfo,
    derivedCanEdit,
    lockQuery,
    sessionLoading,
    session,
  };
}
