import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { trpc } from "~/utils/api";
import { nav } from "~/navigation/nav";
import { useWishlistLocationDraft } from "../draft/hooks";

type PendingImage = {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
};

const MAX_JAR_IMAGES = 9;

function getContentType(img: PendingImage) {
  if (img.mimeType === "image/png") return "image/png" as const;
  if (img.mimeType === "image/webp") return "image/webp" as const;
  return "image/jpeg" as const;
}

async function uploadToPresignedUrl(args: { uploadUrl: string; contentType: string; uri: string }) {
  const response = await fetch(args.uri);
  const blob = await response.blob();
  await fetch(args.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": args.contentType },
    body: blob,
  });
}

export function useWishlistNewJar() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const { data: pickedLocation } = useWishlistLocationDraft("new");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!pickedLocation?.name) return;
    if (!name.trim()) setName(pickedLocation.name);
  }, [name, pickedLocation?.name]);

  useEffect(() => {
    setCoverIndex((prev) => {
      if (pendingImages.length === 0) return 0;
      return Math.min(prev, pendingImages.length - 1);
    });
  }, [pendingImages.length]);

  const createJar = useMutation(
    trpc.wishlist.create.mutationOptions({
      // navigation handled in saveJar to allow uploading images before leaving
    }),
  );
  const requestImageUpload = useMutation(trpc.wishlist.requestImageUpload.mutationOptions());
  const confirmImageUpload = useMutation(trpc.wishlist.confirmImageUpload.mutationOptions());
  const setCover = useMutation(trpc.wishlist.setCover.mutationOptions());

  const canSave = !!pickedLocation && !!name.trim() && !createJar.isPending && !isSaving;
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

  const addImage = async () => {
    if (pendingImages.length >= MAX_JAR_IMAGES) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPendingImages((prev) => {
      if (prev.length >= MAX_JAR_IMAGES) return prev;
      return [
        ...prev,
        {
          uri: asset.uri,
          width: asset.width ?? null,
          height: asset.height ?? null,
          mimeType: asset.mimeType ?? null,
        },
      ];
    });
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const saveJar = async () => {
    if (!pickedLocation) return;
    if (isSaving) return;
    setIsSaving(true);
    try {
      const created = await createJar.mutateAsync({
        name: name.trim(),
        lat: pickedLocation.lat,
        lng: pickedLocation.lng,
        note: note.trim() ? note.trim() : undefined,
        sourceType: "map",
        placeProvider: pickedLocation.placeProvider ?? "mapbox",
        placeId: pickedLocation.placeId,
      });
      if (!created?.id) return;

      // Upload images after create (user perceives one flow).
      const uploadedIds: string[] = [];
      for (const img of pendingImages) {
        const contentType = getContentType(img);
        const presigned = await requestImageUpload.mutateAsync({
          jarId: created.id,
          contentType,
          kind: "image",
        });
        await uploadToPresignedUrl({ uploadUrl: presigned.uploadUrl, contentType, uri: img.uri });
        const confirmedImage = await confirmImageUpload.mutateAsync({
          jarId: created.id,
          key: presigned.key,
          url: presigned.publicUrl,
          width: img.width ?? null,
          height: img.height ?? null,
        });
        if (confirmedImage?.id) uploadedIds.push(confirmedImage.id);
      }

      // Set cover if user picked a non-default one.
      const coverId = uploadedIds[coverIndex];
      if (coverId && coverIndex > 0) {
        await setCover.mutateAsync({ jarId: created.id, kind: "image", imageId: coverId });
      }

      await queryClient.invalidateQueries(trpc.wishlist.list.queryFilter());
      nav.replaceToWishlistDetail(created.id);
    } finally {
      setIsSaving(false);
    }
  };

  const coverUri = useMemo(() => pendingImages[coverIndex]?.uri ?? null, [coverIndex, pendingImages]);

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
    pendingImages,
    coverIndex,
    setCoverIndex,
    coverUri,
    addImage,
    removeImage,
    isSaving,
  };
}
