import { useEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { queryClient, trpc } from "~/utils/api";
import { useTripEditStore } from "../store";

type LockInfo = RouterOutputs["trip"]["lock"]["get"] | null | undefined;

type Params = {
  tripId: string | null;
  isAuthed: boolean;
  userId: string | null;
  lockInfo: LockInfo;
};

export function useTripEditLockEffect({ tripId, isAuthed, userId, lockInfo }: Params) {
  const setHasLock = useTripEditStore((state) => state.setHasLock);
  const setCanEdit = useTripEditStore((state) => state.setCanEdit);

  const derivedIsOwner = useMemo(() => {
    if (!tripId || !isAuthed || !userId) return false;
    if (!lockInfo) return false;
    return lockInfo.userId === userId && !lockInfo.isExpired;
  }, [isAuthed, lockInfo, tripId, userId]);

  // 1) Single source of truth: server lock state drives store flags.
  useEffect(() => {
    setHasLock(derivedIsOwner);
    setCanEdit(derivedIsOwner);
  }, [derivedIsOwner, setCanEdit, setHasLock]);

  // 2) Pure operations.
  const { mutate: acquireTripLock } = useMutation(
    trpc.trip.lock.acquire.mutationOptions({
      onSuccess: async (_, vars) => {
        await queryClient.invalidateQueries(trpc.trip.lock.get.queryFilter({ tripId: vars.tripId }));
      },
    }),
  );

  const { mutate: refreshTripLock } = useMutation(
    trpc.trip.lock.refresh.mutationOptions({
      onSuccess: async (_, vars) => {
        // `get` does not extend TTL; refresh does. We invalidate `get` so UI gets updated expiresAt/isExpired.
        await queryClient.invalidateQueries(trpc.trip.lock.get.queryFilter({ tripId: vars.tripId }));
      },
      onError: async (error, variables) => {
        console.error("Failed to refresh trip lock:", error);
        // `get` does not extend TTL; refresh does. We invalidate `get` so UI gets updated expiresAt/isExpired.
        await queryClient.invalidateQueries(trpc.trip.lock.get.queryFilter({ tripId: variables.tripId }));
      },
    }),
  );

  // 3) Side effect A: try acquire once when lockInfo is known.
  const attemptedAcquireTripIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isAuthed || !tripId || !userId) return;
    if (attemptedAcquireTripIdRef.current === tripId) return;

    // Wait until we know current lock state (null means unlocked).
    if (lockInfo === undefined) return;

    // If another user holds a non-expired lock, don't spam acquire.
    if (lockInfo && !lockInfo.isExpired && lockInfo.userId !== userId) {
      attemptedAcquireTripIdRef.current = tripId;
      return;
    }

    attemptedAcquireTripIdRef.current = tripId;
    acquireTripLock({ tripId });
  }, [acquireTripLock, isAuthed, lockInfo, tripId, userId]);

  // 4) Side effect B: keep TTL alive while we are the owner.
  useEffect(() => {
    if (!derivedIsOwner || !tripId) return;
    const id = setInterval(() => {
      refreshTripLock({ tripId });
    }, 30_000);
    return () => clearInterval(id);
  }, [derivedIsOwner, refreshTripLock, tripId]);

  // 5) Side effect C: release on unmount / trip change (only if we currently have lock).
  useEffect(() => {
    if (!tripId) return;
    const currentTripId = tripId;
    const shouldRelease = derivedIsOwner;
    return () => {
      if (!shouldRelease) return;
      // Avoid relying on a React Query observer during teardown.
      // Calling the underlying mutationFn is more reliable in unmount/transition paths.
      const opts = trpc.trip.lock.release.mutationOptions({
        onSettled: async (_, __, vars) => {
          await queryClient.invalidateQueries(trpc.trip.lock.get.queryFilter({ tripId: vars.tripId }));
        },
      });
      void opts.mutationFn?.({ tripId: currentTripId } as any, undefined as any)
        .catch((error) => {
          console.error("Failed to release trip lock:", error);
        })
        .finally(() => {
          void queryClient.invalidateQueries(trpc.trip.lock.get.queryFilter({ tripId: currentTripId }));
        });
    };
  }, [derivedIsOwner, tripId]);
}
