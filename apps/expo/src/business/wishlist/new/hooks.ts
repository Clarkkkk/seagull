import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { nav } from "~/navigation/nav";
import { useWishlistLocationDraft } from "../draft/hooks";

export function useWishlistNewJar() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const { data: pickedLocation } = useWishlistLocationDraft("new");

  useEffect(() => {
    if (!pickedLocation?.name) return;
    if (!name.trim()) setName(pickedLocation.name);
  }, [name, pickedLocation?.name]);

  const createJar = useMutation(
    trpc.wishlist.create.mutationOptions({
      onSuccess: async (created) => {
        if (!created?.id) return;
        await queryClient.invalidateQueries(trpc.wishlist.list.queryFilter());
        nav.replaceToWishlistDetail(created.id);
      },
    }),
  );

  const canSave = !!pickedLocation && !!name.trim() && !createJar.isPending;
  const displayLocationPrimary =
    pickedLocation?.formattedAddress ??
    (pickedLocation?.country || pickedLocation?.province || pickedLocation?.city
      ? [pickedLocation?.country, pickedLocation?.province, pickedLocation?.city]
          .filter(Boolean)
          .join(" · ")
      : null);
  const displayLocationSecondary = pickedLocation
    ? `${pickedLocation.lat.toFixed(5)}, ${pickedLocation.lng.toFixed(5)}`
    : null;

  const openPicker = () => {
    nav.openPickLocation({
      draftKey: "new",
      initialLat: pickedLocation?.lat ?? 35.681236,
      initialLng: pickedLocation?.lng ?? 139.767125,
    });
  };

  const saveJar = () => {
    if (!pickedLocation) return;
    createJar.mutate({
      name: name.trim(),
      lat: pickedLocation.lat,
      lng: pickedLocation.lng,
      note: note.trim() ? note.trim() : undefined,
      sourceType: "map",
      placeProvider: pickedLocation.placeProvider ?? "mapbox",
      placeId: pickedLocation.placeId,
    });
  };

  return {
    name,
    setName,
    note,
    setNote,
    pickedLocation,
    displayLocationPrimary,
    displayLocationSecondary,
    canSave,
    createJar,
    openPicker,
    saveJar,
  };
}
