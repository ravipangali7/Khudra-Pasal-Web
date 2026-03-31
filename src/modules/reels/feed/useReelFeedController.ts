import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { websiteApi } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import type { Reel } from '../types';

export function useReelFeedController(
  _displayReels: Reel[],
  setDisplayReels: React.Dispatch<React.SetStateAction<Reel[]>>,
) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
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
      if (!reel.product?.id) return;
      reelCartInteractionMut.mutate({ reelId: reel.id });
      addToCart({
        id: String(reel.product.id),
        name: reel.product.name,
        description: reel.caption || reel.product.name,
        price: reel.product.price,
        originalPrice: reel.product.originalPrice || undefined,
        image: reel.product.image,
        category: 'reels',
        rating: reel.product.rating,
        reviewCount: reel.product.reviews,
        inStock: reel.product.inStock,
        unit: '1 item',
      });
      patchReel(reel.id, (r) => ({ ...r, hasAddedToCart: true }));
      setShowToast(true);
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setShowToast(false), 3000);
    },
    [addToCart, reelCartInteractionMut, patchReel],
  );

  const handleLike = useCallback(
    (reel: Reel) => {
      const next = !reel.liked;
      patchReel(reel.id, (r) => ({ ...r, liked: next, likes: next ? r.likes + 1 : Math.max(0, r.likes - 1) }));
      interactionMut.mutate({ reelId: reel.id, type: 'like', enabled: next });
    },
    [interactionMut, patchReel],
  );

  const handleBookmark = useCallback(
    (reel: Reel) => {
      const next = !reel.bookmarked;
      patchReel(reel.id, (r) => ({ ...r, bookmarked: next }));
      interactionMut.mutate({ reelId: reel.id, type: 'bookmark', enabled: next });
    },
    [interactionMut, patchReel],
  );

  const handleShare = useCallback(
    (reel: Reel) => {
      patchReel(reel.id, (r) => ({ ...r, shares: (r.shares ?? 0) + 1 }));
      if (navigator.share) {
        void navigator.share({ title: 'KhudraPasal Reel', text: reel.caption, url: window.location.href }).catch(() => {});
      }
      interactionMut.mutate({ reelId: reel.id, type: 'share' });
    },
    [interactionMut, patchReel],
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
