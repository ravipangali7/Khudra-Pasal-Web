import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { X, Flame, Sparkles, Star, Store, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReelsFeedSkeleton from './ReelsFeedSkeleton';
import ReelsVerticalFeed from './ReelsVerticalFeed';
import ReelsMobileFooter from '../navigation/ReelsMobileFooter';
import { extractResults, websiteApiReelsPreferDirectMp4 } from '@/lib/api';
import { mapApiReelToUi } from '../api/reelMappers';
import { getUniqueVendorsFromReels } from '../reelHelpers';
import { useReelFeedController, useReelViewRecording } from './useReelFeedController';
import { useReelsQueryAuthRev } from './useReelsQueryAuthRev';
import type { Reel } from '../types';
import '../reels-theme.css';

function vendorQueryFromSelection(vendorIdOrSlug: string | null): Record<string, string> {
  if (!vendorIdOrSlug) return {};
  if (/^\d+$/.test(vendorIdOrSlug)) return { vendor_id: vendorIdOrSlug };
  return { vendor_slug: vendorIdOrSlug };
}

const tabs = [
  { id: 'trending', icon: Flame, label: 'Trending' },
  { id: 'new', icon: Sparkles, label: 'New' },
  { id: 'popular', icon: Star, label: 'Popular' },
] as const;

type ReelFeedTab = (typeof tabs)[number]['id'];

function tabFromSearchParams(searchParams: URLSearchParams): ReelFeedTab {
  const t = searchParams.get('tab');
  if (t === 'trending' || t === 'new' || t === 'popular') return t;
  return 'trending';
}

const ReelsFeedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vendorParam = searchParams.get('vendor');

  const [activeTab, setActiveTab] = useState<ReelFeedTab>(() => tabFromSearchParams(searchParams));
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(vendorParam);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [displayReels, setDisplayReels] = useState<Reel[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDeepLinkScrollKeyRef = useRef<string | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const ctl = useReelFeedController(displayReels, setDisplayReels);
  const reelsAuthRev = useReelsQueryAuthRev();

  useEffect(() => {
    setSelectedVendorId(vendorParam);
  }, [vendorParam]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['website', 'reels', activeTab, selectedVendorId, reelsAuthRev],
    queryFn: () =>
      websiteApiReelsPreferDirectMp4({
        tab: activeTab,
        page_size: 80,
        ...vendorQueryFromSelection(selectedVendorId),
      }),
  });

  useEffect(() => {
    setDisplayReels(extractResults(data).map(mapApiReelToUi));
  }, [data]);

  const vendors = useMemo(() => getUniqueVendorsFromReels(displayReels), [displayReels]);

  useEffect(() => {
    lastDeepLinkScrollKeyRef.current = null;
  }, [activeTab, selectedVendorId]);

  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [activeTab, selectedVendorId]);

  useEffect(() => {
    const reelParam = searchParams.get('reel');
    if (!reelParam || displayReels.length === 0) return;
    const id = Number(reelParam);
    if (Number.isNaN(id)) return;
    const index = displayReels.findIndex((r) => r.id === id);
    if (index < 0) return;
    const scrollKey = `${reelParam}-${activeTab}-${selectedVendorId ?? ''}`;
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
  }, [displayReels, searchParams, activeTab, selectedVendorId]);

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 2500);
    return () => clearTimeout(timer);
  }, []);

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

  const handleVendorSelect = (vendorId: string | null) => {
    setSelectedVendorId(vendorId);
    setShowVendorPicker(false);
    setActiveIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

  if (isLoading) return <ReelsFeedSkeleton />;

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

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);

  return (
    <div className="fixed inset-0 z-[40]" style={{ background: 'var(--reels-bg)' }}>
      <div className="h-full flex justify-center">
        <div className="hidden lg:block flex-1" style={{ background: 'var(--reels-bg)' }} />

        <div className="relative w-full lg:max-w-[430px] h-full">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-[10] px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="reels-font-display font-bold text-white text-lg">Reels</span>
                {selectedVendor && (
                  <span className="text-xs text-white/60 reels-font-body">
                    by {selectedVendor.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Vendor filter button */}
                <button
                  onClick={() => setShowVendorPicker(!showVendorPicker)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: selectedVendorId ? 'var(--reels-accent)' : 'var(--reels-glass)',
                  }}
                >
                  <Store className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => handleVendorSelect(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: !selectedVendorId ? 'var(--reels-accent)' : 'var(--reels-glass)' }}
                >
                  <Shuffle className="w-4 h-4 text-white" />
                </button>
                <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--reels-glass)' }}>
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Tab pills */}
            <div className="flex items-center gap-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full reels-font-body text-xs font-medium transition-all"
                    style={{
                      background: activeTab === tab.id ? 'var(--reels-accent)' : 'var(--reels-glass)',
                      color: activeTab === tab.id ? 'white' : 'var(--reels-text-secondary)'
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vendor picker dropdown */}
          <AnimatePresence>
            {showVendorPicker && (
              <motion.div
                className="absolute top-24 left-4 right-4 z-[15] rounded-xl overflow-hidden"
                style={{ background: 'var(--reels-card)', border: '1px solid var(--reels-border)' }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="p-3 border-b" style={{ borderColor: 'var(--reels-border)' }}>
                  <p className="text-white text-sm font-semibold reels-font-display">Browse by Vendor</p>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleVendorSelect(null)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <Shuffle className="w-5 h-5 text-white/60" />
                    <span className="text-white text-sm">All Vendors (Random)</span>
                  </button>
                  {vendors.map(vendor => (
                    <button
                      key={vendor.id}
                      onClick={() => handleVendorSelect(vendor.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                        selectedVendorId === vendor.id ? 'bg-white/10' : ''
                      }`}
                    >
                      <img
                        src={vendor.avatar || 'https://placehold.co/32x32/333/fff?text=V'}
                        alt={vendor.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="text-left flex-1">
                        <p className="text-white text-sm font-medium">{vendor.name}</p>
                        <p className="text-white/40 text-xs">
                          {vendor.totalReels ?? 0} reels
                          {vendor.followers != null && vendor.followers > 0
                            ? ` · ${(vendor.followers / 1000).toFixed(1)}k followers`
                            : ''}
                        </p>
                      </div>
                      {vendor.verified && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <ReelsVerticalFeed
            displayReels={displayReels}
            activeIndex={activeIndex}
            containerRef={containerRef}
            onScroll={handleScroll}
            ctl={ctl}
          />

          {/* Swipe hint */}
          <AnimatePresence>
            {showHint && (
              <motion.div
                className="absolute bottom-20 left-1/2 z-[12] flex flex-col items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: [0, -8, 0] }}
                exit={{ opacity: 0 }}
                transition={{ y: { repeat: 3, duration: 0.8 } }}
                style={{ transform: 'translateX(-50%)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                <span className="reels-font-body text-xs text-white/60 mt-1">Swipe to explore</span>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Right panel (desktop) */}
        <div className="hidden lg:flex flex-1 flex-col p-8 overflow-y-auto" style={{ background: '#050505' }}>
          <h3 className="reels-font-display font-bold text-white text-lg mb-4">Related Products</h3>
          <div className="space-y-3">
            {displayReels.map(reel => (
              <div
                key={reel.id}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:scale-[1.02] transition-transform"
                style={{ background: 'var(--reels-card)', border: '1px solid var(--reels-border)' }}
              >
                <img src={reel.product.image} alt={reel.product.name} className="w-14 h-14 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="reels-font-body text-sm text-white font-medium truncate">{reel.product.name}</p>
                  <p className="reels-font-mono text-xs" style={{ color: 'var(--reels-gold)' }}>NPR {reel.product.price.toLocaleString()}</p>
                  <p className="reels-font-body text-[10px]" style={{ color: 'var(--reels-text-muted)' }}>by {reel.vendor.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReelsMobileFooter />
    </div>
  );
};

export default ReelsFeedPage;
