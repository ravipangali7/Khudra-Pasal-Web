import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { portalApi } from "@/lib/api";

/**
 * Submit a purchase approval request (child portal / storefront child session).
 * Refreshes child rules so `approved_purchase_product_ids` updates after parent acts.
 */
export function useChildPurchaseApprovalRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) =>
      portalApi.childPurchaseApprovalRequestCreate({ product_id: productId }),
    onSuccess: () => {
      toast.success("Request sent to your parent.");
      void queryClient.invalidateQueries({ queryKey: ["portal", "child-rules"] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "child", "rules"] });
      void queryClient.invalidateQueries({ queryKey: ["portal", "child", "purchase-approvals"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit request."),
  });
}
