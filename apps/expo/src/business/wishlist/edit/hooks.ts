import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { nav } from "~/navigation/nav";
import { useWishlistLocationDraft } from "../draft/hooks";

export function useWishlistEditJar(jarId: string | null) {
  const queryClient = useQueryClient();
  const jarQuery = useQuery(
    trpc.wishlist.getById.queryOptions({ id: jarId ?? "" }, { enabled: !!jarId }),
  );
  const jar = jarQuery.data?.jar ?? null;

  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const { data: pickedLocation } = useWishlistLocationDraft(jarId ?? "missing");

  useEffect(() => {
    if (!jar) return;
    setName((prev) => (prev.trim().length ? prev : jar.name));
    setNote((prev) => (prev.trim().length ? prev : jar.note ?? ""));
  }, [jar]);

  const updateJar = useMutation(
    trpc.wishlist.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.wishlist.getById.queryFilter({ id: jarId ?? "" }));
        await queryClient.invalidateQueries(trpc.wishlist.list.queryFilter());
        nav.back();
      },
    }),
  );

  const effectiveName = name.trim() || jar?.name || "";
  const effectiveNote = note.trim();

  const displayLocationPrimary =
    pickedLocation?.formattedAddress ??
    jar?.formattedAddress ??
    (pickedLocation?.country || pickedLocation?.province || pickedLocation?.city
      ? [pickedLocation?.country, pickedLocation?.province, pickedLocation?.city]
          .filter(Boolean)
          .join(" · ")
      : jar
        ? [jar.country, jar.province, jar.city].filter(Boolean).join(" · ")
        : null);
  const displayLocationSecondary = pickedLocation
    ? `${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`
    : jar
      ? `${jar.lat.toFixed(5)}, ${jar.lng.toFixed(5)}`
      : null;

  const openPicker = () => {
    if (!jar) return;
    nav.openPickLocation({
      draftKey: jar.id,
      initialLat: pickedLocation?.lat ?? jar.lat,
      initialLng: pickedLocation?.lng ?? jar.lng,
    });
  };

  const saveJar = () => {
    if (!jar) return;
    updateJar.mutate({
      id: jar.id,
      name: effectiveName,
      note: effectiveNote ? effectiveNote : null,
      lat: pickedLocation?.lat,
      lng: pickedLocation?.lng,
    });
  };

  const canSave = !!effectiveName && !updateJar.isPending;

  return {
    jar,
    jarQuery,
    name,
    setName,
    note,
    setNote,
    effectiveName,
    effectiveNote,
    pickedLocation,
    displayLocationPrimary,
    displayLocationSecondary,
    canSave,
    updateJar,
    openPicker,
    saveJar,
  };
}
