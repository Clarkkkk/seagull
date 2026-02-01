import { useQuery } from "@tanstack/react-query";

import { wishlistLocationDraftKey, type WishlistLocationDraft } from "~/utils/wishlist-location-draft";

export function useWishlistLocationDraft(draftKey: string) {
  return useQuery({
    queryKey: wishlistLocationDraftKey(draftKey),
    queryFn: async () => null as WishlistLocationDraft | null,
    enabled: false,
    initialData: null,
  });
}
