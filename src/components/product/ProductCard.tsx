import { useMemo, useState } from 'react';
import { Star, Minus, Plus, Bell, Flame, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import NotifyMeModal from '@/components/modals/NotifyMeModal';
import { cn } from '@/lib/utils';
import { resolveThemeClass } from '@/lib/categoryTheme';
import { isStorefrontCustomerSession } from '@/lib/api';
import { useChildShoppingRules } from '@/contexts/ChildShoppingRulesContext';
import { evaluateChildProductCommerce } from '@/lib/childShoppingRules';
import { toast } from 'sonner';
import { savePendingCartIntent } from '@/lib/pendingCartIntent';

/** Top-right badge on the image when the product is not flagged as bestseller. */
export type ProductCardTopAccent = 'none' | 'hot' | 'trending';

/** Optional outer frame hint for section context (e.g. flash sale strip). */
export type ProductCardSectionFrame = 'default' | 'flash';

interface ProductCardProps {
  product: Product;
  categoryTheme?: string;
  /** When set, quantity controls only show for this listing instance after Add from here. */
  listingScope?: string;
  topRightAccent?: ProductCardTopAccent;
  sectionFrame?: ProductCardSectionFrame;
}

const DISCOUNT_GREEN = '#28A745';
const ADD_ORANGE = '#FF9800';

const ProductCard = ({
  product,
  categoryTheme,
  listingScope,
  topRightAccent = 'none',
  sectionFrame = 'default',
}: ProductCardProps) => {
  const theme = resolveThemeClass(categoryTheme || product.category);
  const navigate = useNavigate();
  const { addToCart, getItemQuantity, updateQuantity, isListingCartActive } = useCart();
  const {
    isChildShopper,
    rules,
    isLoadingProfile,
    isLoadingRules,
    rulesFetchError,
  } = useChildShoppingRules();
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  const childCommerce = useMemo(() => {
    if (!isChildShopper) return null;
    if (isLoadingProfile || isLoadingRules || rulesFetchError || !rules) return null;
    return evaluateChildProductCommerce(product, rules);
  }, [
    isChildShopper,
    isLoadingProfile,
    isLoadingRules,
    rulesFetchError,
    rules,
    product,
  ]);
  const childCommerceDisabled =
    (isChildShopper &&
      (isLoadingProfile || isLoadingRules || rulesFetchError || !rules)) ||
    Boolean(childCommerce?.commerceDisabled);

  const quantity = getItemQuantity(product.id);
  const showCartControls = listingScope
    ? quantity > 0 && isListingCartActive(listingScope, product.id)
    : quantity > 0;
  const isSoldOut = product.inStock === false;

  const formatPrice = (price: number) => {
    return `Rs. ${price.toLocaleString('en-NP')}`;
  };

  const subtitleRaw = product.unit || product.description || '';
  const subtitle = subtitleRaw
    .replace(/\s*[\u00B7|-]?\s*\d+\s*in\s*stock\b/gi, '')
    .replace(/\s*[\u00B7|-]?\s*in\s*stock\b/gi, '')
    .replace(/\s*[\u00B7|-]?\s*\d+\s*left\b/gi, '')
    .replace(/\s*[\u00B7|-]\s*$/g, '')
    .trim();

  const showOriginal = Boolean(product.originalPrice && product.originalPrice > product.price);
  const savingsAmount =
    showOriginal && product.originalPrice != null ? product.originalPrice - product.price : 0;

  const discountPct =
    product.discount && product.discount > 0
      ? Math.round(product.discount)
      : showOriginal && product.originalPrice
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0;

  const formatReviewCount = (n?: number) => {
    if (n == null || n <= 0) return '0';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) {
      setShowNotifyModal(true);
    } else if (childCommerceDisabled && childCommerce) {
      toast.message(childCommerce.message);
    } else {
      if (!isStorefrontCustomerSession()) {
        const nextPath = `${window.location.pathname}${window.location.search}`;
        savePendingCartIntent({
          product,
          quantity: 1,
          listingScope,
          nextPath,
        });
        navigate(`/login?next=${encodeURIComponent(nextPath)}&shop=1`);
        return;
      }
      addToCart(product, 1, listingScope ? { listingScope } : undefined);
    }
  };

  const handleQuantityChange = (e: React.MouseEvent, newQuantity: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (newQuantity > quantity && childCommerceDisabled && childCommerce) {
      toast.message(childCommerce.message);
      return;
    }
    updateQuantity(product.id, newQuantity);
  };

  const showDiscountBadge = !isSoldOut && discountPct > 0;
  const showBestseller = !isSoldOut && product.isBestseller;
  const showAccent = !isSoldOut && !showBestseller && topRightAccent !== 'none';

  return (
    <>
      <div
        className={cn(
          `product-card theme-${theme} flex flex-col h-full rounded-xl bg-card shadow-md border border-border/40`,
          sectionFrame === 'flash' && 'ring-2 ring-[hsl(var(--storefront-orange)/0.28)] shadow-md',
        )}
      >
        <div className="relative shrink-0">
          <div className="relative aspect-[4/3] bg-muted rounded-t-xl overflow-hidden">
            <Link
              to={`/product/${product.slug}`}
              className="absolute inset-0 z-0 block"
              aria-label={product.name}
            >
              <img
                src={product.image}
                alt=""
                className={cn(
                  'w-full h-full object-cover transition-transform duration-300 hover:scale-105',
                  isSoldOut && 'opacity-60',
                )}
                loading="lazy"
              />
            </Link>

            {isSoldOut && (
              <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-muted-foreground text-primary-foreground text-[11px] md:text-[10px] font-bold rounded-md">
                Sold Out
              </div>
            )}

            {showDiscountBadge && (
              <div
                className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md text-white text-[11px] md:text-[10px] font-bold shadow-sm"
                style={{ backgroundColor: DISCOUNT_GREEN }}
              >
                {discountPct}% OFF
              </div>
            )}

            {showBestseller && (
              <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-md bg-amber-500 text-white text-[11px] md:text-[10px] font-bold shadow-sm">
                Bestseller
              </div>
            )}

            {showAccent && (
              <div
                className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm bg-amber-500/25 border border-amber-400/30"
                aria-hidden
              >
                {topRightAccent === 'hot' ? (
                  <Flame className="w-4 h-4 text-amber-600" strokeWidth={2.25} />
                ) : (
                  <TrendingUp className="w-4 h-4 text-amber-600" strokeWidth={2.25} />
                )}
              </div>
            )}

            {!isSoldOut && !showCartControls && (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={childCommerceDisabled}
                className={cn(
                  'absolute bottom-2 right-2 z-20 px-3.5 py-1.5 rounded-lg text-white text-xs font-bold shadow-md transition-all',
                  childCommerceDisabled
                    ? 'opacity-50 cursor-not-allowed bg-muted-foreground'
                    : 'hover:opacity-95 active:scale-[0.97]',
                )}
                style={childCommerceDisabled ? undefined : { backgroundColor: ADD_ORANGE }}
                aria-label="Add to cart"
              >
                ADD
              </button>
            )}
          </div>

          {!isSoldOut && showCartControls && (
            <div
              className="absolute right-2 bottom-0 z-30 flex items-center rounded-full shadow-lg translate-y-1/2 text-white"
              style={{ backgroundColor: DISCOUNT_GREEN }}
            >
              <button
                type="button"
                onClick={(e) => handleQuantityChange(e, quantity - 1)}
                className="pl-3 pr-2 py-2 md:pl-2.5 md:pr-1.5 md:py-1.5 hover:bg-white/15 transition-colors rounded-l-full"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4 md:w-3.5 md:h-3.5 stroke-[2.5]" />
              </button>
              <span className="px-1 min-w-[1.75rem] text-center text-sm md:text-xs font-bold tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={(e) => handleQuantityChange(e, quantity + 1)}
                disabled={childCommerceDisabled}
                className={cn(
                  'pr-3 pl-2 py-2 md:pr-2.5 md:pl-1.5 md:py-1.5 transition-colors rounded-r-full',
                  childCommerceDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15',
                )}
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4 md:w-3.5 md:h-3.5 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>

        <div
          className={cn(
            'p-3 md:p-3.5 flex flex-col flex-1 min-h-0 gap-2 rounded-b-xl',
            !isSoldOut && showCartControls && 'pt-5 md:pt-5',
          )}
        >
          {isSoldOut ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
              <span className="text-lg md:text-base font-bold text-foreground">{formatPrice(product.price)}</span>
              {showOriginal && (
                <span className="text-sm md:text-xs text-muted-foreground line-through">
                  {formatPrice(product.originalPrice!)}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <span className="text-lg md:text-base font-bold text-foreground">{formatPrice(product.price)}</span>
                {showOriginal && (
                  <span className="text-sm md:text-xs text-[#666666] line-through">
                    {formatPrice(product.originalPrice!)}
                  </span>
                )}
              </div>
              {savingsAmount > 0 && (
                <div className="w-fit px-2 py-0.5 rounded-md text-[11px] md:text-[10px] font-semibold bg-[#28A745]/12 text-[#1e7e34]">
                  {formatPrice(savingsAmount)} OFF
                </div>
              )}
            </>
          )}

          <Link to={`/product/${product.slug}`} className="block min-h-0">
            <h3 className="text-[15px] md:text-sm font-bold text-foreground line-clamp-2 leading-snug">
              {product.name}
            </h3>
            {subtitle && (
              <p className="text-[13px] md:text-xs text-[#666666] line-clamp-1 mt-1">{subtitle}</p>
            )}
            {product.rating ? (
              <div className="mt-2 flex items-center gap-1 text-[13px] md:text-xs text-slate-500">
                <Star className="w-3.5 h-3.5 shrink-0 fill-amber-400 text-amber-400" />
                <span>
                  {Number(product.rating).toFixed(1)} ({formatReviewCount(product.reviewCount)})
                </span>
              </div>
            ) : (
              <p className="mt-2 text-[12px] md:text-[11px] text-muted-foreground">No reviews yet</p>
            )}
          </Link>

          {isSoldOut && (
            <div className="mt-auto pt-1">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full min-h-11 md:min-h-10 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-card border border-primary text-primary rounded-lg text-sm md:text-xs font-bold hover:bg-primary/10 transition-colors"
              >
                <Bell className="w-3.5 h-3.5" />
                Notify
              </button>
            </div>
          )}
        </div>
      </div>

      <NotifyMeModal product={product} isOpen={showNotifyModal} onClose={() => setShowNotifyModal(false)} />
    </>
  );
};

export default ProductCard;
