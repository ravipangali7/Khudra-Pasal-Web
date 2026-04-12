import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Flame, Sparkles, Star } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import ReelCard from '../feed/ReelCard';
import ReelActionsSidebar from '../feed/ReelActionsSidebar';
import ReelCommentDrawer from '../feed/ReelCommentDrawer';
import AddedToCartToast from '../feed/AddedToCartToast';
import ReelsFeedSkeleton from '../feed/ReelsFeedSkeleton';
import { isStorefrontCustomerSession, vendorApi, extractResults, websiteApi } from '@/lib/api';
import { savePendingCartIntent } from '@/lib/pendingCartIntent';
import { mapApiReelToUi } from '../api/reelMappers';
import { useCart } from '@/contexts/CartContext';
import { useChildShoppingRules } from '@/contexts/ChildShoppingRulesContext';
import { evaluateChildProductCommerce } from '@/lib/childShoppingRules';
import { useChildPurchaseApprovalRequest } from '@/hooks/useChildPurchaseApprovalRequest';
import { toast } from 'sonner';
import type { Reel } from '../types';
import { useReelsMutePreference } from '../feed/useReelsMutePreference';
import '../reels-theme.css';

const PAGE_SIZE = 12;

function snapshotReel(r: Reel): Reel {
  return {
    ...r,
    product: { ...r.product },
    vendor: { ...r.vendor },
  };
}

const tabs = [
  { id: 'trending' as const, icon: Flame, label: 'Trending' },
  { id: 'new' as const, icon: Sparkles, label: 'New' },
  { id: 'popular' as const, icon: Star, label: 'Popular' },
];

type Props = {
  vendorId: number;
  initialReelId: number;
  onClose: () => void;
};

const VendorReelsViewerOverlay: React.FC<Props> = ({ vendorId, initialReelId, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('trending');
  const [activeIndex, setActiveIndex] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [displayReels, setDisplayReels] = useState<Reel[]>([]);
  const [isMuted, toggleMutePreference] = useReelsMutePreference();
  const [activeProgress, setActiveProgress] = useState(0);
  const [commentDrawerReelId, setCommentDrawerReelId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrolledToInitialRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const viewedReelIdsRef = useRef<Set<number>>(new Set());
  const viewTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const { addToCart } = useCart();
  const {
    isChildShopper,
    rules,
    isLoadingProfile,
    isLoadingRules,
    rulesFetchError,
  } = useChildShoppingRules();
  const purchaseApprovalMut = useChildPurchaseApprovalRequest();
  const toCartProduct = useCallback(
    (reel: Reel) => ({
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
    }),
    [],
  );

  const redirectToLogin = useCallback((reel: Reel, quantity = 1) => {
    const nextPath = `${location.pathname}${location.search}`;
    if (reel.product?.id) {
      savePendingCartIntent({
        product: toCartProduct(reel),
        quantity,
        nextPath,
      });
    }
    navigate(`/login?next=${encodeURIComponent(nextPath)}&shop=1`);
  }, [location.pathname, location.search, navigate, toCartProduct]);

  const handleToggleMute = useCallback(() => {
    toggleMutePreference();
  }, [toggleMutePreference]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['vendor', 'reels-viewer', vendorId, activeTab],
    queryFn: ({ pageParam }) =>
      vendorApi.reelsByVendor(vendorId, {
        page: pageParam,
        page_size: PAGE_SIZE,
        tab: activeTab,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.next ? allPages.length + 1 : undefined),
  });

  const scrollToIndex = useCallback(
    async (nextIndex: number) => {
      const container = containerRef.current;
      if (!container) return;
      if (nextIndex >= displayReels.length) {
        if (hasNextPage && !isFetchingNextPage) {
          await fetchNextPage();
        } else {
          return;
        }
      }
      const target = Math.min(nextIndex, Math.max(0, displayReels.length - 1));
      const h = container.clientHeight;
      container.scrollTop = target * h;
      setActiveIndex(target);
    },
    [displayReels.length, hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const flat = data?.pages.flatMap((p) => extractResults(p).map(mapApiReelToUi)) ?? [];
    setDisplayReels(flat);
  }, [data]);

  useEffect(() => {
    scrolledToInitialRef.current = false;
    setActiveIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [activeTab, vendorId]);

  useEffect(() => {
    if (scrolledToInitialRef.current || displayReels.length === 0) return;
    const idx = displayReels.findIndex((r) => r.id === initialReelId);
    if (idx >= 0) {
      const container = containerRef.current;
      if (container?.clientHeight) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = containerRef.current;
            if (!el) return;
            el.scrollTop = idx * el.clientHeight;
            setActiveIndex(idx);
            scrolledToInitialRef.current = true;
          });
        });
      }
      return;
    }
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
      return;
    }
    scrolledToInitialRef.current = true;
  }, [displayReels, initialReelId, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const root = containerRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasNextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: '200px', threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, displayReels.length]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const h = container.clientHeight;
      if (!h) return;
      const index = Math.round(container.scrollTop / h);
      setActiveIndex((prev) => {
        const next = Math.min(index, Math.max(0, displayReels.length - 1));
        return prev === next ? prev : next;
      });
    });
  }, [displayReels.length]);

  const patchReel = useCallback((reelId: number, updater: (prev: Reel) => Reel) => {
    setDisplayReels((prev) => prev.map((r) => (r.id === reelId ? updater(r) : r)));
  }, []);

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
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Action failed');
    },
  });

  const reelCartInteractionMut = useMutation({
    mutationFn: ({ reelId }: { reelId: number }) => websiteApi.reelInteraction(reelId, 'cart_add'),
    onError: (error: Error) => toast.error(error.message || 'Could not record cart action'),
  });

  const handleAddToCart = useCallback(
    (reel: Reel) => {
      if (!reel.product?.id) return;
      if (!isStorefrontCustomerSession()) {
        redirectToLogin(reel, 1);
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
      patchReel,
      reelCartInteractionMut,
      redirectToLogin,
      toCartProduct,
      isChildShopper,
      rules,
      isLoadingProfile,
      isLoadingRules,
      rulesFetchError,
      purchaseApprovalMut,
    ],
  );

  const handleLike = useCallback(
    (reel: Reel) => {
      const next = !reel.liked;
      patchReel(reel.id, (r) => ({
        ...r,
        liked: next,
        likes: next ? r.likes + 1 : Math.max(0, r.likes - 1),
      }));
      interactionMut.mutate({ reelId: reel.id, type: 'like', enabled: next });
    },
    [interactionMut, patchReel],
  );

  const handleBookmark = useCallback(
    (reel: Reel) => {
      const next = !reel.bookmarked;
      patchReel(reel.id, (r) => ({
        ...r,
        bookmarked: next,
        bookmarks: next ? (r.bookmarks ?? 0) + 1 : Math.max(0, (r.bookmarks ?? 0) - 1),
      }));
      interactionMut.mutate({ reelId: reel.id, type: 'bookmark', enabled: next });
    },
    [interactionMut, patchReel],
  );

  const handleShare = useCallback(
    (reel: Reel) => {
      const previousReel = snapshotReel(reel);
      patchReel(reel.id, (r) => ({ ...r, shares: (r.shares ?? 0) + 1 }));
      if (navigator.share) {
        void navigator
          .share({ title: 'KhudraPasal Reel', text: reel.caption, url: window.location.href })
          .catch(() => {});
      }
      interactionMut.mutate({ reelId: reel.id, type: 'share', previousReel });
    },
    [interactionMut, patchReel],
  );

  const handleComment = useCallback(
    (reel: Reel) => {
      setCommentDrawerReelId(reel.id);
    },
    [],
  );

  const handleBuyNow = useCallback(
    (reel: Reel, quantity = 1) => {
      if (!reel.product?.id) return;
      if (!isStorefrontCustomerSession()) {
        redirectToLogin(reel, quantity);
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
      redirectToLogin,
      isChildShopper,
      rules,
      isLoadingProfile,
      isLoadingRules,
      rulesFetchError,
    ],
  );

  useEffect(() => {
    setActiveProgress(0);
  }, [activeIndex]);

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
  }, [activeIndex, displayReels, patchReel]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) window.cancelAnimationFrame(scrollRafRef.current);
      if (viewTimerRef.current != null) window.clearTimeout(viewTimerRef.current);
      if (toastTimerRef.current != null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const safeActiveIndex = useMemo(() => {
    if (displayReels.length === 0) return 0;
    return Math.min(Math.max(0, activeIndex), displayReels.length - 1);
  }, [displayReels.length, activeIndex]);

  const activeReel = useMemo(() => displayReels[safeActiveIndex], [displayReels, safeActiveIndex]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200]" style={{ background: 'var(--reels-bg)' }}>
        <ReelsFeedSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 p-6"
        style={{ background: 'var(--reels-bg)' }}
      >
        <p className="reels-font-body text-sm text-white/80 text-center">Could not load your reels.</p>
        <button
          type="button"
          onClick={onClose}
          className="reels-font-body text-sm px-4 py-2 rounded-xl text-white"
          style={{ background: 'var(--reels-accent)' }}
        >
          Close
        </button>
      </div>
    );
  }

  if (displayReels.length === 0) {
    return (
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 p-6"
        style={{ background: 'var(--reels-bg)' }}
      >
        <p className="reels-font-body text-white text-center">No reels to show.</p>
        <button
          type="button"
          onClick={onClose}
          className="reels-font-body text-sm px-4 py-2 rounded-xl text-white"
          style={{ background: 'var(--reels-accent)' }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200]" style={{ background: 'var(--reels-bg)' }}>
      <div className="h-full flex justify-center">
        <div className="hidden lg:block flex-1" style={{ background: 'var(--reels-bg)' }} />

        <div className="relative flex h-full min-h-0 w-full max-w-full flex-row lg:max-w-[min(494px,calc(100vw-2rem))] shrink-0">
          <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col lg:max-w-[430px]">
            <div className="absolute top-0 left-0 right-0 z-[10] px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="reels-font-display font-bold text-white text-lg">Reels</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--reels-glass)' }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full reels-font-body text-xs font-medium transition-all"
                      style={{
                        background: activeTab === tab.id ? 'var(--reels-accent)' : 'var(--reels-glass)',
                        color: activeTab === tab.id ? 'white' : 'var(--reels-text-secondary)',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              ref={containerRef}
              className="reels-snap-container min-h-0 flex-1"
              onScroll={handleScroll}
            >
              {displayReels.map((reel, index) => (
                <ReelCard
                  key={reel.id}
                  reel={reel}
                  isActive={index === activeIndex}
                  isMuted={isMuted || index !== activeIndex}
                  onToggleMute={handleToggleMute}
                  progress={index === activeIndex ? activeProgress : 0}
                  onProgress={(p) => {
                    if (index !== activeIndex) return;
                    setActiveProgress(p);
                  }}
                  onProgressComplete={() => {
                    if (index !== activeIndex) return;
                    void scrollToIndex(activeIndex + 1);
                  }}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                />
              ))}
              <div ref={sentinelRef} className="h-px w-full shrink-0 pointer-events-none" aria-hidden />
            </div>

            {isFetchingNextPage && (
              <div className="pointer-events-none absolute bottom-6 left-1/2 z-[12] -translate-x-1/2 text-xs text-white/60 reels-font-body">
                Loading more…
              </div>
            )}

            <AddedToCartToast
              isVisible={showToast}
              onViewCart={() =>
                navigate('/checkout', { state: { from: `${location.pathname}${location.search}` } })
              }
              onDismiss={() => setShowToast(false)}
            />
            <ReelCommentDrawer
              reelId={commentDrawerReelId}
              open={commentDrawerReelId != null}
              onClose={() => setCommentDrawerReelId(null)}
              onCommentAdded={() => {
                if (commentDrawerReelId == null) return;
                patchReel(commentDrawerReelId, (r) => ({ ...r, commentsCount: (r.commentsCount ?? 0) + 1 }));
              }}
            />
          </div>

          {activeReel ? (
            <ReelActionsSidebar
              disabled={displayReels.length === 0}
              views={activeReel.views}
              likes={activeReel.likes}
              shares={activeReel.shares ?? 0}
              bookmarks={activeReel.bookmarks ?? 0}
              commentsCount={activeReel.commentsCount}
              liked={activeReel.liked}
              saved={activeReel.bookmarked}
              onLike={() => handleLike(activeReel)}
              onSave={() => handleBookmark(activeReel)}
              onShare={() => handleShare(activeReel)}
              onComment={() => handleComment(activeReel)}
            />
          ) : null}
        </div>

        <div className="hidden lg:flex flex-1 flex-col p-8 overflow-y-auto" style={{ background: '#050505' }}>
          <h3 className="reels-font-display font-bold text-white text-lg mb-4">Related Products</h3>
          <div className="space-y-3">
            {displayReels.map((reel) => {
              const isActive = activeReel?.id === reel.id;
              return (
                <button
                  key={reel.id}
                  type="button"
                  onClick={() => {
                    const idx = displayReels.findIndex((r) => r.id === reel.id);
                    if (idx < 0 || !containerRef.current) return;
                    const h = containerRef.current.clientHeight;
                    containerRef.current.scrollTop = idx * h;
                    setActiveIndex(idx);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-transform hover:scale-[1.02] ${
                    isActive ? 'ring-1 ring-white/30' : ''
                  }`}
                  style={{ background: 'var(--reels-card)', border: '1px solid var(--reels-border)' }}
                >
                  <img
                    src={reel.product.image}
                    alt={reel.product.name}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="reels-font-body text-sm text-white font-medium truncate">{reel.product.name}</p>
                    <p className="reels-font-mono text-xs" style={{ color: 'var(--reels-gold)' }}>
                      NPR {reel.product.price.toLocaleString()}
                    </p>
                    <p className="reels-font-body text-[10px]" style={{ color: 'var(--reels-text-muted)' }}>
                      by {reel.vendor.name}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorReelsViewerOverlay;
