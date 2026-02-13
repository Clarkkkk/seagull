import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuthSession } from "~/business/auth/hooks";
import { trpc } from "~/utils/api";

export function useWishlistList() {
  const { isAuthed, isLoading: sessionLoading } = useAuthSession();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const effectiveQuery = debouncedQuery.trim();
  const listInput = useMemo(() => {
    return effectiveQuery ? { limit: 50, q: effectiveQuery } : { limit: 50 };
  }, [effectiveQuery]);

  const listQuery = useQuery(
    trpc.wishlist.list.queryOptions(listInput, { enabled: isAuthed && !sessionLoading }),
  );

  return {
    jars: listQuery.data ?? [],
    query,
    setQuery,
    effectiveQuery,
    isAuthed,
    sessionLoading,
    listQuery,
  };
}
