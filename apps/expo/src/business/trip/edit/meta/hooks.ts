import { useMutation } from "@tanstack/react-query";

import { queryClient, trpc } from "~/utils/api";
import { useTripEditStore } from "../store";

export function useTripEditMeta() {
  const tripId = useTripEditStore((state) => state.tripId);
  const metaStartDate = useTripEditStore((state) => state.metaStartDate);
  const metaEndDate = useTripEditStore((state) => state.metaEndDate);
  const setMetaStartDate = useTripEditStore((state) => state.setMetaStartDate);
  const setMetaEndDate = useTripEditStore((state) => state.setMetaEndDate);
  const setErrorMessage = useTripEditStore((state) => state.setErrorMessage);
  const resetPlan = useTripEditStore((state) => state.resetPlan);

  const updateMeta = useMutation(
    trpc.trip.updateMeta.mutationOptions({
      onSuccess: async () => {
        setErrorMessage(null);
        resetPlan();
        await queryClient.invalidateQueries(trpc.trip.getById.queryFilter({ id: tripId ?? "" }));
      },
      onError: (err) => {
        setErrorMessage(err.message);
      },
    }),
  );

  const updateMetaRange = (start: string, end: string) => {
    // Business: validate range input before saving.
    if (!tripId) return;
    const s = start.trim();
    const e = end.trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    if ((s && !e) || (!s && e)) {
      setErrorMessage("开始日期和结束日期必须同时填写或同时留空。");
      return;
    }
    if (s && e) {
      if (!iso.test(s) || !iso.test(e)) {
        setErrorMessage("日期格式必须为 YYYY-MM-DD。");
        return;
      }
      if (s > e) {
        setErrorMessage("开始日期必须早于或等于结束日期。");
        return;
      }
    }
    updateMeta.mutate({
      tripId: tripId ?? "",
      startDate: s ? s : null,
      endDate: e ? e : null,
    });
  };

  return {
    metaStartDate,
    metaEndDate,
    setMetaStartDate,
    setMetaEndDate,
    updateMeta,
    updateMetaRange,
  };
}
