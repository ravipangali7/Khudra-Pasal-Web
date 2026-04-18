import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { isStorefrontCustomerSession, isWebsiteApiAuthenticatedSession, websiteApi } from '@/lib/api';
import { savePendingCartIntent } from '@/lib/pendingCartIntent';
import { useCart } from '@/contexts/CartContext';
import { useChildShoppingRules } from '@/contexts/ChildShoppingRulesContext';
import { evaluateChildProductCommerce } from '@/lib/childShoppingRules';
import { useChildPurchaseApprovalRequest } from '@/hooks/useChildPurchaseApprovalRequest';
import { toast } from 'sonner';
import type { Reel } from '../types';
import { useReelsMutePreference } from './useReelsMutePreference';

function snapshotReel(r: Reel): Reel {
  return {
    ...r,
    product: { ...r.product },
    vendor: { ...r.vendor },
  };
}

function toCartProduct(reel: Reel) {
  return {
    id: String(reel.product.id),
    name: reel.product.name,
    description: reel.caption || reel.product.name,
    price: reel.product.price,
    originalPrice: reel.product.originalPrice || undefined,
    image: reel.product.image,
    category: reel.product.categorySlug || 'all',
    parentCategorySlug: reel.product.parentCategorySlug ?? undefined,
    categoryAncestorSlugs: reel.product.categoryAncestorSlugs,
    rating: reel.product.rating,
    reviewCount: reel.product.reviews,
    inStock: reel.product.inStock,
    unit: '1 item',
  };
}

export function useReelFeedController(
  _displayReels: Reel[],
  setDisplayReels: React.Dispatch<React.SetStateAction<Reel[]>>,
) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { addToCart } = useCart();
  const {
    isChildShopper,
    rules,
    isLoadingProfile,
    isLoadingRules,
    rulesFetchError,
  } = useChildShoppingRules();
  const purchaseApprovalMut = useChildPurchaseApprovalRequest();
  const [showToast, setShowToast] = useState(false);
  const [isMuted, toggleMutePreference] = useReelsMutePreference();
  const [commentDrawerReelId, setCommentDrawerReelId] = useState<number | null>(null);
  const viewedReelIdsRef = useRef<Set<number>>(new Set());
  const viewTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const patchReel = useCallback(
    (reelId: number, updater: (prev: Reel) => Reel) => {
      setDisplayReels((prev) => prev.map((r) => (r.id === reelId ? updater(r) : r)));
    },
    [setDisplayReels],
  );

  const redirectToLoginForReel = useCallback(
    (reel: Reel, quantity = 1) => {
      const nextPath = `${location.pathname}${location.search}`;
      if (reel.product?.id) {
        savePendingCartIntent({
          product: toCartProduct(reel),
          quantity,
          nextPath,
        });
      }
      navigate(`/login?next=${encodeURIComponent(nextPath)}&shop=1`);
    },
    [location.pathname, location.search, navigate],
  );

  const requireCustomerForEngagement = useCallback(() => {
    if (isWebsiteApiAuthenticatedSession()) return true;
    const nextPath = `${location.pathname}${location.search}`;
    navigate(`/login?next=${encodeURIComponent(nextPath)}&shop=1`);
    return false;
  }, [location.pathname, location.search, navigate]);

  const interactionMut = useMutation({
    mutationFn: async ({
      reelId,
      type,
      enabled,
    }: {
      reelId: number;
      type: 'like' | 'bookmark' | 'share';
      enabled?: boolean;
      previousReel?: Reel;
    }) => {
      if (type === 'share') {
        return websiteApi.reelInteraction(reelId, 'share');
      }
      if (enabled) {
        return websiteApi.reelInteraction(reelId, type);
      }
      return websiteApi.removeReelInteraction(reelId, type);
    },
    onSuccess: (data, vars) => {
      if (
        vars.type === 'share' &&
        data &&
        typeof data === 'object' &&
        'created' in data &&
        (data as { created?: boolean }).created === false &&
        vars.previousReel
      ) {
        patchReel(vars.reelId, () => snapshotReel(vars.previousReel!));
      }
      if (vars.type === 'bookmark') {
        void queryClient.invalidateQueries({ queryKey: ['portal', 'reels-favourites'] });
      }
    },
    onError: (error: Error, vars) => {
      toast.error(error.message || 'Action failed');
      if (vars.previousReel) {
        patchReel(vars.reelId, () => snapshotReel(vars.previousReel!));
      }
    },
  });

  const reelCartInteractionMut = useMutation({
    mutationFn: ({ reelId }: { reelId: number }) =>
      websiteApi.reelInteraction(reelId, 'cart_add'),
    onError: (error: Error) => toast.error(error.message || 'Could not record cart action'),
  });

  const handleAddToCart = useCallback(
    (reel: Reel) => {
      if (!reel.product?.id) {
        toast.error('No product is linked to this reel.');
        return;
      }
      if (reel.product.purchasable === false) {
        toast.error(
          'This product is not available for purchase. It may be inactive or the seller is not approved yet.',
        );
        return;
      }
      if (!isStorefrontCustomerSession()) {
        addToCart(toCartProduct(reel));
        return;
      }
      if (isChildShopper) {
        if (isLoadingProfile || isLoadingRules) {
          toast.message('Checking your family shopping rules…');
          return;
        }
        if (rulesFetchError || !rules) {
          toast.error('Could not load family shopping rules. Try again.');
          return;
        }
        const ev = evaluateChildProductCommerce(
          {
            id: String(reel.product.id),
            category: reel.product.categorySlug || 'all',
            price: reel.product.price,
            parentCategorySlug: reel.product.parentCategorySlug ?? null,
            categoryAncestorSlugs: reel.product.categoryAncestorSlugs,
          },
          rules,
        );
        if (
          ev.needsApproval &&
          !ev.hasPurchaseApproval &&
          !ev.blocked &&
          !ev.overMaxPrice &&
          !ev.purchasesOff
        ) {
          purchaseApprovalMut.mutate(reel.product.id);
          return;
        }
        if (ev.commerceDisabled) {
          toast.message(ev.message);
          return;
        }
      }
      reelCartInteractionMut.mutate({ reelId: reel.id });
      addToCart(toCartProduct(reel));
      patchReel(reel.id, (r) => ({ ...r, hasAddedToCart: true }));
      setShowToast(true);
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setShowToast(false), 3000);
    },
    [
      addToCart,
      reelCartInteractionMut,
      patchReel,
      isChildShopper,
      rules,
      isLoadingProfile,
      isLoadingRules,
      rulesFetchError,
      purchaseApprovalMut,
    ],
  );

  const handleBuyNow = useCallback(
    (reel: Reel, quantity = 1) => {
      if (!reel.product?.id) {
        toast.error('No product is linked to this reel.');
        return;
      }
      if (reel.product.purchasable === false) {
        toast.error(
          'This product is not available for purchase. It may be inactive or the seller is not approved yet.',
        );
        return;
      }
      if (!isStorefrontCustomerSession()) {
        redirectToLoginForReel(reel, quantity);
        return;
      }
      if (isChildShopper) {
        if (isLoadingProfile || isLoadingRules) {
          toast.message('Checking your family shopping rules…');
          return;
        }
        if (rulesFetchError || !rules) {
          toast.error('Could not load family shopping rules. Try again.');
          return;
        }
        const ev = evaluateChildProductCommerce(
          {
            id: String(reel.product.id),
            category: reel.product.categorySlug || 'all',
            price: reel.product.price,
            parentCategorySlug: reel.product.parentCategorySlug ?? null,
            categoryAncestorSlugs: reel.product.categoryAncestorSlugs,
          },
          rules,
        );
        if (ev.commerceDisabled) {
          toast.message(ev.message);
          return;
        }
      }
      navigate('/checkout', {
        state: {
          from: `${location.pathname}${location.search}`,
          buyNow: {
            productId: reel.product.id,
            productName: reel.product.name,
            price: reel.product.price,
            image: reel.product.image,
            quantity,
            reelId: reel.id,
            categorySlug: reel.product.categorySlug,
            parentCategorySlug: reel.product.parentCategorySlug ?? undefined,
            categoryAncestorSlugs: reel.product.categoryAncestorSlugs,
          },
        },
      });
    },
    [
      location.pathname,
      location.search,
      navigate,
      redirectToLoginForReel,
      isChildShopper,
      rules,
      isLoadingProfile,
      isLoadingRules,
      rulesFetchError,
    ],
  );

  const handleLike = useCallback(
    (reel: Reel) => {
      if (!requireCustomerForEngagement()) return;
      const next = !reel.liked;
      const previousReel = snapshotReel(reel);
      patchReel(reel.id, (r) => ({ ...r, liked: next, likes: next ? r.likes + 1 : Math.max(0, r.likes - 1) }));
      interactionMut.mutate({ reelId: reel.id, type: 'like', enabled: next, previousReel });
    },
    [interactionMut, patchReel, requireCustomerForEngagement],
  );

  const handleBookmark = useCallback(
    (reel: Reel) => {
      if (!requireCustomerForEngagement()) return;
      const next = !reel.bookmarked;
      const previousReel = snapshotReel(reel);
      patchReel(reel.id, (r) => ({
        ...r,
        bookmarked: next,
        bookmarks: next ? (r.bookmarks ?? 0) + 1 : Math.max(0, (r.bookmarks ?? 0) - 1),
      }));
      interactionMut.mutate({ reelId: reel.id, type: 'bookmark', enabled: next, previousReel });
    },
    [interactionMut, patchReel, requireCustomerForEngagement],
  );

  const handleShare = useCallback(
    (reel: Reel) => {
      if (!requireCustomerForEngagement()) return;
      const shareUrl = `${window.location.origin}/reels?reel=${reel.id}`;
      const previousReel = snapshotReel(reel);
      patchReel(reel.id, (r) => ({ ...r, shares: (r.shares ?? 0) + 1 }));
      if (navigator.share) {
        void navigator
          .share({ title: 'KhudraPasal Reel', text: reel.caption || 'Check out this reel', url: shareUrl })
          .catch(() => {});
      }
      interactionMut.mutate({ reelId: reel.id, type: 'share', previousReel });
    },
    [interactionMut, patchReel, requireCustomerForEngagement],
  );

  const handleComment = useCallback((reel: Reel) => {
    setCommentDrawerReelId(reel.id);
  }, []);

  const handleToggleMute = useCallback(() => {
    toggleMutePreference();
  }, [toggleMutePreference]);

  useEffect(() => {
    return () => {
      if (viewTimerRef.current != null) window.clearTimeout(viewTimerRef.current);
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  return {
    showToast,
    setShowToast,
    isMuted,
    commentDrawerReelId,
    setCommentDrawerReelId,
    patchReel,
    handleAddToCart,
    handleBuyNow,
    handleLike,
    handleBookmark,
    handleShare,
    handleComment,
    handleToggleMute,
    navigate,
    viewedReelIdsRef,
    viewTimerRef,
  };
}

export type ReelFeedControllerApi = ReturnType<typeof useReelFeedController>;

/** Records views when activeIndex changes; pass activeIndex from parent scroll sync. */
export function useReelViewRecording(
  displayReels: Reel[],
  activeIndex: number,
  patchReel: (reelId: number, updater: (prev: Reel) => Reel) => void,
  viewedReelIdsRef: React.MutableRefObject<Set<number>>,
  viewTimerRef: React.MutableRefObject<number | null>,
) {
  useEffect(() => {
    const active = displayReels[activeIndex];
    if (!active) return;
    if (viewedReelIdsRef.current.has(active.id)) return;
    if (viewTimerRef.current != null) window.clearTimeout(viewTimerRef.current);
    viewTimerRef.current = window.setTimeout(() => {
      if (viewedReelIdsRef.current.has(active.id)) return;
      void websiteApi
        .recordReelView(active.id)
        .then((res) => {
          viewedReelIdsRef.current.add(active.id);
          patchReel(active.id, (r) => ({ ...r, views: res.views }));
        })
        .catch(() => {});
    }, 250);
  }, [activeIndex, displayReels, patchReel, viewedReelIdsRef, viewTimerRef]);
}
