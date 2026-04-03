import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Bell, Minus, Package, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import NotifyMeModal from "@/components/modals/NotifyMeModal";
import {
  mapWebsiteProductToUi,
  type PortalChildRulesResponse,
  type WebsiteProduct,
  type WebsiteVendorMini,
  websiteApi,
} from "@/lib/api";
import { evaluateChildProductCommerce } from "@/lib/childShoppingRules";

const PAGE_SIZE = 100;

async function fetchAllProductsAllVendors(): Promise<WebsiteProduct[]> {
  const all: WebsiteProduct[] = [];
  let page = 1;
  for (;;) {
    const res = await websiteApi.productsAllVendors({ page, page_size: PAGE_SIZE });
    all.push(...res.results);
    if (!res.next) break;
    page += 1;
  }
  return all;
}

export type PortalProductsCatalogVariant = "main" | "family" | "child";

export type PortalProductsCatalogSectionProps = {
  variant: PortalProductsCatalogVariant;
  /** When `variant` is `child`, pass rules from `portalApi.childRules()` for filtering and banners. */
  childRules?: PortalChildRulesResponse | null;
};

function formatPrice(price: string | undefined): string {
  const n = Number(price || 0);
  if (!Number.isFinite(n)) return "Rs. —";
  return `Rs. ${n.toLocaleString("en-NP")}`;
}

function availabilityLabel(stock: number): { label: string; className: string } {
  if (stock <= 0) {
    return { label: "Out of stock", className: "bg-muted text-muted-foreground" };
  }
  if (stock <= 5) {
    return { label: `${stock} left`, className: "bg-amber-500/15 text-amber-800 dark:text-amber-200" };
  }
  return { label: "In stock", className: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200" };
}

type VendorGroup = {
  key: string;
  seller: WebsiteVendorMini | null;
  products: WebsiteProduct[];
};

function PortalCatalogProductCard({
  product,
  commerceDisabled,
  commerceDisabledMessage,
  needsApprovalBadge,
}: {
  product: WebsiteProduct;
  commerceDisabled: boolean;
  commerceDisabledMessage: string;
  needsApprovalBadge: boolean;
}) {
  const ui = mapWebsiteProductToUi(product);
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, getItemQuantity, updateQuantity } = useCart();
  const [notifyOpen, setNotifyOpen] = useState(false);

  const quantity = getItemQuantity(ui.id);
  const isInCart = quantity > 0;
  const isSoldOut = !ui.inStock;

  const onCommerceBlocked = () => {
    toast.message(commerceDisabledMessage);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (commerceDisabled) {
      onCommerceBlocked();
      return;
    }
    if (isSoldOut) {
      setNotifyOpen(true);
    } else {
      addToCart(ui);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (commerceDisabled) {
      onCommerceBlocked();
      return;
    }
    if (isSoldOut) return;
    const sellerId = ui.vendor?.id ? Number(ui.vendor.id) : undefined;
    navigate("/checkout", {
      state: {
        from: `${location.pathname}${location.search}`,
        buyNow: {
          productId: Number(ui.id),
          productName: ui.name,
          price: ui.price,
          image: ui.image || undefined,
          quantity: 1,
          categorySlug: product.category_slug,
          ...(sellerId != null && Number.isFinite(sellerId) ? { sellerId } : {}),
        },
      },
    });
  };

  const handleQuantityChange = (e: React.MouseEvent, newQuantity: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (commerceDisabled) {
      onCommerceBlocked();
      return;
    }
    updateQuantity(ui.id, newQuantity);
  };

  return (
    <>
      <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all">
        <Link to={`/product/${product.slug}`} className="block shrink-0">
          <div className="relative aspect-square bg-muted overflow-hidden">
            <img
              src={product.image_url || "/placeholder.svg"}
              alt=""
              className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
              loading="lazy"
            />
            {needsApprovalBadge ? (
              <Badge
                className="absolute top-2 left-2 text-[10px] px-1.5 py-0 bg-secondary/95"
                variant="secondary"
              >
                Needs parent approval
              </Badge>
            ) : null}
            {isSoldOut ? (
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-muted-foreground text-primary-foreground text-[10px] font-bold rounded">
                Sold out
              </div>
            ) : null}
          </div>
        </Link>

        <div className="p-3 flex flex-col flex-1 min-h-0 gap-2">
          <Link to={`/product/${product.slug}`} className="block min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{product.name}</p>
            <p className="text-sm font-semibold text-primary mt-1">{formatPrice(product.price)}</p>
            <span
              className={cn(
                "inline-flex mt-1 text-[10px] font-medium px-2 py-0.5 rounded-md",
                availabilityLabel(product.stock).className,
              )}
            >
              {availabilityLabel(product.stock).label}
            </span>
          </Link>

          <div className="mt-auto pt-1 space-y-2">
            {isSoldOut ? (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={commerceDisabled}
                className={cn(
                  "w-full flex items-center justify-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition-colors",
                  commerceDisabled
                    ? "border-border text-muted-foreground cursor-not-allowed opacity-60"
                    : "border-border bg-background hover:bg-muted text-foreground",
                )}
              >
                <Bell className="w-3.5 h-3.5" />
                Notify me
              </button>
            ) : (
              <>
                {isInCart && !commerceDisabled ? (
                  <div className="flex items-center justify-center gap-0.5 bg-primary rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={(e) => handleQuantityChange(e, quantity - 1)}
                      className="p-2 text-primary-foreground hover:bg-primary-foreground/15 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-primary-foreground font-bold min-w-[32px] text-center text-sm">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleQuantityChange(e, quantity + 1)}
                      className="p-2 text-primary-foreground hover:bg-primary-foreground/15 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={cn(
                      "w-full py-2 px-1.5 rounded-lg border text-[11px] sm:text-xs font-semibold transition-colors",
                      commerceDisabled
                        ? "border-border text-muted-foreground cursor-not-allowed opacity-60"
                        : "border-border bg-background hover:bg-muted",
                      isInCart && !commerceDisabled && "border-primary/40 text-primary",
                    )}
                  >
                    {isInCart && !commerceDisabled ? "Add another" : "Add"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={commerceDisabled}
                    className={cn(
                      "w-full py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-opacity",
                      commerceDisabled
                        ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                        : "bg-primary text-primary-foreground hover:opacity-90",
                    )}
                  >
                    Buy Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <NotifyMeModal product={ui} isOpen={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </>
  );
}

export default function PortalProductsCatalogSection({
  variant,
  childRules,
}: PortalProductsCatalogSectionProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["portal", "products", "all-vendors", variant],
    queryFn: fetchAllProductsAllVendors,
  });

  const blockedSlugs = useMemo(() => {
    if (variant !== "child" || !childRules?.product_restrictions?.length) return new Set<string>();
    const s = new Set<string>();
    for (const r of childRules.product_restrictions) {
      if (r.is_blocked && r.category_slug) s.add(r.category_slug);
    }
    return s;
  }, [variant, childRules]);

  const filteredProducts = useMemo(() => {
    const list = data ?? [];
    if (variant !== "child" || blockedSlugs.size === 0) return list;
    return list.filter((p) => !blockedSlugs.has(p.category_slug));
  }, [data, variant, blockedSlugs]);

  const vendorGroups = useMemo((): VendorGroup[] => {
    const map = new Map<string, WebsiteProduct[]>();
    for (const p of filteredProducts) {
      const sid = p.seller?.id;
      const key = sid != null ? `v-${sid}` : "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    const groups: VendorGroup[] = [];
    for (const [key, products] of map) {
      const seller = products[0]?.seller ?? null;
      groups.push({ key, seller, products });
    }
    groups.sort((a, b) => {
      const na = (a.seller?.store_name || "Other").toLowerCase();
      const nb = (b.seller?.store_name || "Other").toLowerCase();
      return na.localeCompare(nb);
    });
    return groups;
  }, [filteredProducts]);

  const purchasesOff =
    variant === "child" && childRules?.group_permissions && !childRules.group_permissions.allow_online_purchases;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <p className="text-sm text-muted-foreground">Loading products…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 lg:p-6">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load products."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-primary shrink-0" />
          Products
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Marketplace catalog grouped by vendor. Add to cart or buy now; checkout opens on the main store.
        </p>
      </div>

      {purchasesOff ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Online purchases are off</AlertTitle>
          <AlertDescription>
            Your parent has turned off online purchases for your account. You can still browse products here.
          </AlertDescription>
        </Alert>
      ) : null}

      {vendorGroups.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No products to show{variant === "child" && blockedSlugs.size > 0 ? " (some may be hidden by parent rules)." : "."}
          </CardContent>
        </Card>
      ) : (
        vendorGroups.map((group) => (
          <section key={group.key} className="space-y-3">
            <div className="flex items-center gap-3 border-b border-border pb-2">
              {group.seller?.logo_url ? (
                <img
                  src={group.seller.logo_url}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover border border-border bg-muted"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {group.seller?.store_name ?? "Other sellers"}
                </h3>
                {group.seller?.is_verified ? (
                  <p className="text-xs text-muted-foreground">Verified vendor</p>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.products.map((product) => {
                const ev =
                  variant === "child" && childRules
                    ? evaluateChildProductCommerce(
                        {
                          category: product.category_slug || "all",
                          price: Number(product.price || 0),
                        },
                        childRules,
                      )
                    : null;
                const commerceDisabled = Boolean(ev?.commerceDisabled);
                const commerceDisabledMessage =
                  ev?.message ||
                  (purchasesOff ? "Online purchases are turned off for your account." : "");

                return (
                  <PortalCatalogProductCard
                    key={product.id}
                    product={product}
                    commerceDisabled={commerceDisabled}
                    commerceDisabledMessage={commerceDisabledMessage}
                    needsApprovalBadge={Boolean(ev?.needsApproval)}
                  />
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
