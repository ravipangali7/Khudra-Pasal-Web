import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { mapWebsiteProductToUi, websiteApi } from "@/lib/api";

const WISHLIST_QUERY_KEY = ["product-wishlist"] as const;

export default function PortalWishlistSection() {
  const queryClient = useQueryClient();
  const { data: rows = [], isLoading, isError, error } = useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: () => websiteApi.wishlist(),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: number | string) => websiteApi.removeWishlistItem(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
    onError: (e: unknown) => {
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "Could not remove item.";
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading wishlist…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-card p-8 text-center text-sm text-destructive">
        {error instanceof Error ? error.message : "Could not load wishlist."}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">Your wishlist is empty</p>
        <p className="text-sm text-muted-foreground">Save items from the shop with the heart icon on any product.</p>
        <Button asChild variant="default" size="sm" className="mt-2">
          <Link to="/homepage">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {rows.length} {rows.length === 1 ? "item" : "items"} saved
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const p = mapWebsiteProductToUi(row.product);
          const href = `/product/${encodeURIComponent(row.product.slug || String(row.product.id))}`;
          return (
            <li
              key={row.id}
              className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <Link to={href} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={p.image || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
              </Link>
              <div className="min-w-0 flex-1 flex flex-col">
                <Link to={href} className="font-medium text-foreground line-clamp-2 hover:text-primary">
                  {p.name}
                </Link>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Rs. {Number(row.product.price || 0).toLocaleString("en-NP")}
                </p>
                <div className="mt-auto pt-2 flex items-center gap-2">
                  <Button asChild variant="secondary" size="sm" className="text-xs">
                    <Link to={href}>View</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={removeMutation.isPending}
                    aria-label="Remove from wishlist"
                    onClick={() => removeMutation.mutate(row.product.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
