import { useMemo } from "react";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { extractResults, type PagedResponse } from "@/lib/api";

/** Single stable reference for empty lists — avoids useEffect([data]) infinite loops when `data ?? []` creates a new [] each render. */
const ADMIN_LIST_EMPTY = [] as unknown[];

export function useAdminList<T>(
  queryKey: (string | number | boolean | undefined)[],
  fetcher: () => Promise<PagedResponse<T>>,
  options?: {
    enabled?: boolean;
    refetchInterval?: UseQueryOptions<PagedResponse<T>>["refetchInterval"];
    refetchOnWindowFocus?: boolean;
  },
) {
  const query = useQuery({
    queryKey,
    queryFn: fetcher,
    select: (d) => extractResults<T>(d),
    enabled: options?.enabled ?? true,
    retry: false,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? true,
  });

  const data = useMemo(() => {
    const raw = query.data;
    if (raw === undefined || raw.length === 0) {
      return ADMIN_LIST_EMPTY as T[];
    }
    return raw;
  }, [query.data]);

  return { ...query, data };
}
