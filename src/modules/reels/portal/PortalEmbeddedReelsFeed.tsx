import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { websiteApi, extractResults } from '@/lib/api';
import { mapApiReelToUi } from '../api/reelMappers';
import ReelsVerticalFeed from '../feed/ReelsVerticalFeed';
import { useReelFeedController, useReelViewRecording } from '../feed/useReelFeedController';
import { useReelsQueryAuthRev } from '../feed/useReelsQueryAuthRev';
import type { Reel } from '../types';
import '../reels-theme.css';

type Props = {
  title: string;
  /** Comma-separated vendor IDs for ?vendor_ids= — omit for global trending (all vendors with public reels). */
  vendorIds?: string | null;
  className?: string;
};

/**
 * TikTok-style reel stack for Main Portal (dashboard / transactions). Uses same interaction logic as /reels.
 */
const PortalEmbeddedReelsFeed: React.FC<Props> = ({ title, vendorIds, className = '' }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayReels, setDisplayReels] = useState<Reel[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const ctl = useReelFeedController(displayReels, setDisplayReels);
  const reelsAuthRev = useReelsQueryAuthRev();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'embedded-reels-trending', vendorIds ?? 'all', reelsAuthRev],
    queryFn: async () => {
      const pageSize = 40;
      const scoped = await websiteApi.reelsTrendingAllVendors({
        page_size: pageSize,
        ...(vendorIds ? { vendor_ids: vendorIds } : {}),
      });
      const rows = extractResults(scoped);
      // Scoped feed may be empty — fall back to global trending
      if (rows.length === 0 && vendorIds) {
        const fallback = await websiteApi.reelsTrendingAllVendors({ page_size: pageSize });
        if (extractResults(fallback).length > 0) return fallback;
      }
      return scoped;
    },
  });

  const serverReels = useMemo(
    () => (data ? extractResults(data).map(mapApiReelToUi) : []),
    [data],
  );

  useLayoutEffect(() => {
    setDisplayReels(serverReels);
  }, [serverReels]);

  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [vendorIds, data]);

  /** Avoid empty first paint: state syncs in layout effect after data arrives */
  const reelsToShow = displayReels.length > 0 ? displayReels : serverReels;

  useReelViewRecording(
    reelsToShow,
    activeIndex,
    ctl.patchReel,
    ctl.viewedReelIdsRef,
    ctl.viewTimerRef,
  );

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
  }, [reelsToShow.length]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current != null) window.cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  const hasApiResults = Boolean(data && extractResults(data).length > 0);

  if (isLoading) {
    return (
      <section className={`rounded-xl border bg-card overflow-hidden ${className}`}>
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <div className="h-[min(70vh,600px)] flex items-center justify-center bg-muted/30">
          <p className="text-sm text-muted-foreground">Loading reels…</p>
        </div>
      </section>
    );
  }

  if (isError || !hasApiResults) {
    return (
      <section className={`rounded-xl border bg-card overflow-hidden ${className}`}>
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <div className="py-8 text-center text-sm text-muted-foreground">
          {isError ? 'Could not load reels.' : 'No reels to show yet.'}
        </div>
      </section>
    );
  }

  return (
    <section className={`rounded-xl border bg-card overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <div className="bg-[var(--reels-bg)] p-0">
        <ReelsVerticalFeed
          displayReels={reelsToShow}
          activeIndex={activeIndex}
          containerRef={containerRef}
          onScroll={handleScroll}
          ctl={ctl}
          embedded
        />
      </div>
    </section>
  );
};

export default PortalEmbeddedReelsFeed;
