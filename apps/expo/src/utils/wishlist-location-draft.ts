import type { QueryClient } from "@tanstack/react-query";

export type WishlistLocationDraft = {
  lat: number;
  lng: number;
  name?: string;
  formattedAddress?: string;
  country?: string;
  province?: string;
  city?: string;
  placeId?: string;
  placeProvider?: string;
};

export const wishlistLocationDraftKey = (draftKey: string) =>
  ["wishlistLocationDraft", draftKey] as const;

export function setWishlistLocationDraft(
  queryClient: QueryClient,
  draftKey: string,
  draft: WishlistLocationDraft,
) {
  queryClient.setQueryData(wishlistLocationDraftKey(draftKey), draft);
}

export function consumeWishlistLocationDraft(
  queryClient: QueryClient,
  draftKey: string,
) {
  const key = wishlistLocationDraftKey(draftKey);
  const value = queryClient.getQueryData<WishlistLocationDraft>(key);
  if (value) queryClient.removeQueries({ queryKey: key });
  return value ?? null;
}

