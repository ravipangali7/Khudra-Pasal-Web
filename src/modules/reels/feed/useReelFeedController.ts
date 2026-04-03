import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { isStorefrontCustomerSession, websiteApi } from '@/lib/api';
import { savePendingCartIntent } from '@/lib/pendingCartIntent';
import { useCart } from '@/contexts/CartContext';
import { useChildShoppingRules } from '@/contexts/ChildShoppingRulesContext';
import { evaluateChildProductCommerce } from '@/lib/childShoppingRules';
import { toast } from 'sonner';
import type { Reel } from '../types';

function toCartProduct(reel: Reel) {
  return {
    id: String(reel.product.id),
    name: reel.product.name,
    description: reel.caption || reel.product.name,
    price: reel.product.price,
    originalPrice: reel.product.originalPrice || undefined,
    image: reel.product.image,
    category: reel.product.categorySlug || 'all',
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
  const { isChildShopper, rules, isLoadingRules } = useChildShoppingRules();
  const [showToast, setShowToast] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
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
    if (isStorefrontCustomerSession()) return true;
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
    }) => {
      if (type === 'share') {
        return websiteApi.reelInteraction(reelId, 'share');
      }
      if (enabled) {
        return websiteApi.reelInteraction(reelId, type);
      }
      return websiteApi.removeReelInteraction(reelId, type);
    },
    onSuccess: (_data, vars) => {
      if (vars.type === 'bookmark') {
        void queryClient.invalidateQueries({ queryKey: ['portal', 'reels-favourites'] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Action failed');
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
      if (!isStorefrontCustomerSession()) {
        addToCart(toCartProduct(reel));
        return;
      }
      reelCartInteractionMut.mutate({ reelId: reel.id });
      addToCart(toCartProduct(reel));
      patchReel(reel.id, (r) => ({ ...r, hasAddedToCart: true }));
      setShowToast(true);
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setShowToast(false), 3000);
    },
    [addToCart, reelCartInteractionMut, patchReel],
  );

  const handleBuyNow = useCallback(
    (reel: Reel, quantity = 1) => {
      if (!reel.product?.id) {
        toast.error('No product is linked to this reel.');
        return;
      }
      if (!isStorefrontCustomerSession()) {
        redirectToLoginForReel(reel, quantity);
        return;
      }
      if (isChildShopper && rules && !isLoadingRules) {
        const ev = evaluateChildProductCommerce(
          {
            category: reel.product.categorySlug || 'all',
            price: reel.product.price,
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
      isLoadingRules,
    ],
  );

  const handleLike = useCallback(
    (reel: Reel) => {
      if (!requireCustomerForEngagement()) return;
      const next = !reel.liked;
      patchReel(reel.id, (r) => ({ ...r, liked: next, likes: next ? r.likes + 1 : Math.max(0, r.likes - 1) }));
      interactionMut.mutate({ reelId: reel.id, type: 'like', enabled: next });
    },
    [interactionMut, patchReel, requireCustomerForEngagement],
  );

  const handleBookmark = useCallback(
    (reel: Reel) => {
      if (!requireCustomerForEngagement()) return;
      const next = !reel.bookmarked;
      patchReel(reel.id, (r) => ({ ...r, bookmarked: next }));
      interactionMut.mutate({ reelId: reel.id, type: 'bookmark', enabled: next });
    },
    [interactionMut, patchReel, requireCustomerForEngagement],
  );

  const handleShare = useCallback(
    (reel: Reel) => {
      if (!requireCustomerForEngagement()) return;
      const shareUrl = `${window.location.origin}/reels?reel=${reel.id}`;
      patchReel(reel.id, (r) => ({ ...r, shares: (r.shares ?? 0) + 1 }));
      if (navigator.share) {
        void navigator
          .share({ title: 'KhudraPasal Reel', text: reel.caption || 'Check out this reel', url: shareUrl })
          .catch(() => {});
      }
      interactionMut.mutate({ reelId: reel.id, type: 'share' });
    },
    [interactionMut, patchReel, requireCustomerForEngagement],
  );

  const handleComment = useCallback((reel: Reel) => {
    setCommentDrawerReelId(reel.id);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

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
