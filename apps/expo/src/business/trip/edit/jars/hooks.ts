import { useQuery } from "@tanstack/react-query";

import { useAuthSession } from "~/business/auth/hooks";
import { trpc } from "~/utils/api";

export function useTripEditJars() {
  const { isAuthed, isLoading: sessionLoading } = useAuthSession();
  const { data: jars = [] } = useQuery(
    trpc.wishlist.list.queryOptions({ limit: 50 }, { enabled: isAuthed && !sessionLoading }),
  );

  return { jars };
}
