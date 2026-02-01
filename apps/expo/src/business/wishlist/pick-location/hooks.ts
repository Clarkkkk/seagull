import type { NavigationProp } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { setWishlistLocationDraft } from "~/utils/wishlist-location-draft";
import type { WishlistLocationDraft } from "~/utils/wishlist-location-draft";
import { nav } from "~/navigation/nav";

type PickLocationParams = {
  navigation?: NavigationProp<any>;
  draftKey: string;
  initialLat: number;
  initialLng: number;
};

export function useWishlistPickLocation(params: PickLocationParams) {
  const { navigation, draftKey, initialLat, initialLng } = params;
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [selected, setSelected] = useState<WishlistLocationDraft>({
    lat: initialLat,
    lng: initialLng,
  });
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (isComposing) return;
    const t = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(t);
  }, [query, isComposing]);

  const effectiveQuery = debouncedQuery.trim();
  const searchEnabled = !isComposing && effectiveQuery.length >= 2;
  const candidatesQuery = useQuery(
    trpc.map.search.queryOptions(
      { query: effectiveQuery, limit: 5 },
      { enabled: searchEnabled },
    ),
  );

  const region = useMemo(() => {
    return {
      latitude: selected.lat,
      longitude: selected.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [selected.lat, selected.lng]);

  const cancel = () => {
    if (navigation?.canGoBack()) navigation.goBack();
    else nav.back();
  };

  const confirm = async () => {
    setIsConfirming(true);
    try {
      let next = selected;
      if (!next.country || !next.province || !next.city) {
        const addr = await queryClient.fetchQuery(
          trpc.map.reverseGeocode.queryOptions({
            lat: next.lat,
            lng: next.lng,
          }),
        );
        next = {
          ...next,
          country: addr.country,
          province: addr.province,
          city: addr.city,
          formattedAddress: addr.formattedAddress,
        };
      }

      setWishlistLocationDraft(queryClient, draftKey, next);
      if (navigation?.canGoBack()) navigation.goBack();
      else nav.back();
    } finally {
      setIsConfirming(false);
    }
  };

  return {
    query,
    setQuery,
    isComposing,
    setIsComposing,
    selected,
    setSelected,
    isConfirming,
    candidates: candidatesQuery.data ?? [],
    searchEnabled,
    region,
    cancel,
    confirm,
  };
}
