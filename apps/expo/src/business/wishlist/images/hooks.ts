import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { trpc } from "~/utils/api";

type UploadKind = "image" | "cover";

const MAX_JAR_IMAGES = 9;
const FALLBACK_CONTENT_TYPE = "image/jpeg";

function getContentType(asset: ImagePicker.ImagePickerAsset) {
  if (asset.mimeType === "image/png") return "image/png";
  if (asset.mimeType === "image/webp") return "image/webp";
  return FALLBACK_CONTENT_TYPE;
}

async function uploadToPresignedUrl(args: {
  uploadUrl: string;
  contentType: string;
  asset: ImagePicker.ImagePickerAsset;
}) {
  const response = await fetch(args.asset.uri);
  const blob = await response.blob();
  await fetch(args.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": args.contentType },
    body: blob,
  });
}

export function useWishlistJarImages(jarId: string | null) {
  const queryClient = useQueryClient();
  const imagesQuery = useQuery(
    trpc.wishlist.listImages.queryOptions({ jarId: jarId ?? "" }, { enabled: !!jarId }),
  );
  const images = imagesQuery.data ?? [];
  const isFull = images.length >= MAX_JAR_IMAGES;

  const requestUpload = useMutation(trpc.wishlist.requestImageUpload.mutationOptions());
  const confirmUpload = useMutation(trpc.wishlist.confirmImageUpload.mutationOptions());
  const deleteImage = useMutation(trpc.wishlist.deleteImage.mutationOptions());
  const setCover = useMutation(trpc.wishlist.setCover.mutationOptions());
  const clearCover = useMutation(trpc.wishlist.clearCover.mutationOptions());

  const pickAndUpload = async (kind: UploadKind) => {
    if (!jarId) return { ok: false as const, reason: "missing-jar" as const };
    if (kind === "image" && isFull) return { ok: false as const, reason: "limit" as const };

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { ok: false as const, reason: "permission" as const };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });
    if (result.canceled || !result.assets?.[0]) {
      return { ok: false as const, reason: "canceled" as const };
    }

    const asset = result.assets[0];
    const contentType = getContentType(asset);
    const presigned = await requestUpload.mutateAsync({
      jarId,
      contentType,
      kind,
    });

    await uploadToPresignedUrl({
      uploadUrl: presigned.uploadUrl,
      contentType,
      asset,
    });

    if (kind === "image") {
      await confirmUpload.mutateAsync({
        jarId,
        key: presigned.key,
        url: presigned.publicUrl,
        width: asset.width ?? null,
        height: asset.height ?? null,
      });
    } else {
      await setCover.mutateAsync({
        jarId,
        kind: "upload",
        key: presigned.key,
        url: presigned.publicUrl,
      });
    }

    await queryClient.invalidateQueries(trpc.wishlist.listImages.queryFilter({ jarId }));
    await queryClient.invalidateQueries(trpc.wishlist.getById.queryFilter({ id: jarId }));
    return { ok: true as const };
  };

  const deleteJarImage = async (imageId: string) => {
    if (!jarId) return;
    await deleteImage.mutateAsync({ jarId, imageId });
    await queryClient.invalidateQueries(trpc.wishlist.listImages.queryFilter({ jarId }));
    await queryClient.invalidateQueries(trpc.wishlist.getById.queryFilter({ id: jarId }));
  };

  const setCoverFromImage = async (imageId: string) => {
    if (!jarId) return;
    await setCover.mutateAsync({ jarId, kind: "image", imageId });
    await queryClient.invalidateQueries(trpc.wishlist.getById.queryFilter({ id: jarId }));
  };

  const clearCoverImage = async () => {
    if (!jarId) return;
    await clearCover.mutateAsync({ jarId });
    await queryClient.invalidateQueries(trpc.wishlist.getById.queryFilter({ id: jarId }));
  };

  const isUploading = useMemo(
    () =>
      requestUpload.isPending ||
      confirmUpload.isPending ||
      setCover.isPending ||
      deleteImage.isPending ||
      clearCover.isPending,
    [
      requestUpload.isPending,
      confirmUpload.isPending,
      setCover.isPending,
      deleteImage.isPending,
      clearCover.isPending,
    ],
  );

  return {
    images,
    imagesQuery,
    isFull,
    isUploading,
    pickAndUpload,
    deleteJarImage,
    setCoverFromImage,
    clearCoverImage,
  };
}
