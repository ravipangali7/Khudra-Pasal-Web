import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";

/**
 * Coarse UI permissions aligned with admin nav roles (see adminRbac.ts).
 */
export function useAdminCrudPolicy() {
  const { data: profile } = useQuery({
    queryKey: ["admin", "profile", "crud-policy"],
    queryFn: () => adminApi.profile(),
    staleTime: 60_000,
  });

  const role = (profile?.role ?? "staff").toLowerCase();
  const su = Boolean(profile?.is_superuser) || role === "super_admin";

  const viewerLike = role === "viewer";
  const financeOnly = role === "finance";

  return {
    canProductMutate: su || (!viewerLike && !financeOnly),
    canProductDelete: su || (!viewerLike && !financeOnly),
    canCustomerMutate: su || (!viewerLike && !financeOnly),
    canVendorMutate: su || (!viewerLike && !financeOnly),
    canOrderStatus: su || !viewerLike,
    canRefund: su || !viewerLike,
    canPOCreate: su || (!viewerLike && !financeOnly),
    canEditAdmins: su,
  };
}
