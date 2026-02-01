import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export function useWishlistJar(jarId: string | null) {
  const jarQuery = useQuery(
    trpc.wishlist.getById.queryOptions({ id: jarId ?? "" }, { enabled: !!jarId }),
  );
  const jar = jarQuery.data?.jar ?? null;
  const statusLabel =
    jar?.status === "archived"
      ? "已归档"
      : jar?.status === "in_trip"
        ? "行程中"
        : jar?.status === "inactive"
          ? "未加入行程"
          : "未知状态";
  const badgeVariant: "muted" | "success" | "default" =
    jar?.status === "archived" ? "muted" : jar?.status === "in_trip" ? "success" : "default";

  return {
    jar,
    statusLabel,
    badgeVariant,
    jarQuery,
  };
}
