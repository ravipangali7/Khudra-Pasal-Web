import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import ReelsFeedSkeleton from './ReelsFeedSkeleton';
import ReelsVerticalFeed from './ReelsVerticalFeed';
import ReelsMobileFooter from '../navigation/ReelsMobileFooter';
import { extractResults, websiteApi } from '@/lib/api';
import { mapApiReelToUi } from '../api/reelMappers';
import { useReelFeedController, useReelViewRecording } from './useReelFeedController';
import { useReelsQueryAuthRev } from './useReelsQueryAuthRev';
import type { Reel } from '../types';
import '../reels-theme.css';

const PAGE_SIZE = 12;
/** Main feed includes TikTok/YouTube/Instagram embeds (not prefer-direct-MP4-only). */

const ReelsFeedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [activeIndex, setActiveIndex] = useState(0);
  const [activePlaybackProgress, setActivePlaybackProgress] = useState(0);
  const [displayReels, setDisplayReels] = useState<Reel[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDeepLinkScrollKeyRef = useRef<string | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const ctl = useReelFeedController(displayReels, setDisplayReels);
  const reelsAuthRev = useReelsQueryAuthRev();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
  } = useInfiniteQuery({
    queryKey: ['website', 'reels', 'trending', 'immersive', 'all-platforms', reelsAuthRev],
    queryFn: ({ pageParam }) =>
      websiteApi.reels({
        tab: 'trending',
        page_size: PAGE_SIZE,
        page: pageParam as number,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.next ? allPages.length + 1 : undefined),
  });

  useEffect(() => {
    const flat = data?.pages.flatMap((p) => extractResults(p).map(mapApiReelToUi)) ?? [];
    setDisplayReels(flat);
  }, [data]);

  useEffect(() => {
    const reelParam = searchParams.get('reel');
    if (!reelParam || displayReels.length === 0) return;
    const id = Number(reelParam);
    if (Number.isNaN(id)) return;
    const index = displayReels.findIndex((r) => r.id === id);
    if (index < 0) return;
    const scrollKey = reelParam;
    if (lastDeepLinkScrollKeyRef.current === scrollKey) return;
    const container = containerRef.current;
    if (!container) return;
    const h = container.clientHeight;
    if (!h) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;
        el.scrollTop = index * el.clientHeight;
        setActiveIndex(index);
        lastDeepLinkScrollKeyRef.current = scrollKey;
      });
    });
  }, [displayReels, searchParams]);

  useEffect(() => {
    setActivePlaybackProgress(0);
  }, [activeIndex]);

  useEffect(() => {
    if (displayReels.length === 0) return;
    if (!hasNextPage || isFetchingNextPage) return;
    if (activeIndex >= displayReels.length - 4) {
      void fetchNextPage();
    }
  }, [activeIndex, displayReels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const scrollToNextReel = useCallback(() => {
    const container = containerRef.current;
    if (!container || displayReels.length === 0) return;
    const h = container.clientHeight;
    if (!h) return;
    const next = Math.min(activeIndex + 1, displayReels.length - 1);
    if (next === activeIndex) return;
    container.scrollTo({ top: next * h, behavior: 'smooth' });
    setActiveIndex(next);
  }, [activeIndex, displayReels.length]);

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
        if (prev === index) return prev;
        return Math.min(index, Math.max(0, displayReels.length - 1));
      });
    });
  }, [displayReels.length]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) window.cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  useReelViewRecording(
    displayReels,
    activeIndex,
    ctl.patchReel,
    ctl.viewedReelIdsRef,
    ctl.viewTimerRef,
  );

  if (isPending) return <ReelsFeedSkeleton />;

  if (isError) {
    return (
      <div className="fixed inset-0 z-[40] flex items-center justify-center p-6" style={{ background: 'var(--reels-bg)' }}>
        <p className="reels-font-body text-sm text-white/80 text-center">Could not load reels. Check the API and try again.</p>
      </div>
    );
  }

  if (displayReels.length === 0) {
    return (
      <div className="fixed inset-0 z-[40] flex flex-col items-center justify-center gap-4 p-6" style={{ background: 'var(--reels-bg)' }}>
        <p className="reels-font-body text-white text-center">No reels yet for this filter.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="reels-font-body text-sm px-4 py-2 rounded-xl text-white"
          style={{ background: 'var(--reels-accent)' }}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[40]" style={{ background: 'var(--reels-bg)' }}>
      <div className="h-full flex justify-center">
        <div className="relative w-full max-w-[430px] h-full">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 z-[50] w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'var(--reels-glass)', border: '1px solid var(--reels-glass-border)' }}
            aria-label="Close reels"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <ReelsVerticalFeed
            variant="immersive"
            displayReels={displayReels}
            activeIndex={activeIndex}
            containerRef={containerRef}
            onScroll={handleScroll}
            ctl={ctl}
            showCartToast
            onViewCart={() => navigate('/checkout')}
            playbackProgress={{
              activeProgress: activePlaybackProgress,
              onProgress: setActivePlaybackProgress,
              onComplete: scrollToNextReel,
            }}
            className="reels-snap-container--with-mobile-nav"
          />

          {isFetchingNextPage ? (
            <div
              className="absolute bottom-20 left-1/2 z-[46] -translate-x-1/2 rounded-full px-3 py-1 reels-font-body text-[10px] text-white/80"
              style={{ background: 'var(--reels-glass)', border: '1px solid var(--reels-glass-border)' }}
            >
              Loading more…
            </div>
          ) : null}
        </div>
      </div>

      <ReelsMobileFooter />
    </div>
  );
};

export default ReelsFeedPage;
