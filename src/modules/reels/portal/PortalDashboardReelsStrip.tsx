import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, ExternalLink, Eye, Heart, MessageCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { extractResults, websiteApiReelsTrendingAllVendorsPreferDirectMp4 } from '@/lib/api';
import { mapApiReelToUi } from '../api/reelMappers';
import { useReelsQueryAuthRev } from '../feed/useReelsQueryAuthRev';
import type { Reel } from '../types';

const formatReelCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

interface PortalDashboardReelsStripProps {
  className?: string;
}

/**
 * Vendor-dashboard-style horizontal reel strip: all-vendors trending, thumbnails only;
 * opens full /reels feed on click (no in-portal autoplay).
 */
const PortalDashboardReelsStrip: React.FC<PortalDashboardReelsStripProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const reelsAuthRev = useReelsQueryAuthRev();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal', 'dashboard-reels-strip', 'all-vendors', reelsAuthRev],
    queryFn: () => websiteApiReelsTrendingAllVendorsPreferDirectMp4({ page_size: 16 }),
  });

  const reels = useMemo(() => extractResults(data).map(mapApiReelToUi), [data]);

  const openReel = (reel: Reel) => {
    navigate(`/reels?tab=trending&reel=${reel.id}&vendor=${encodeURIComponent(reel.vendor.id)}`);
  };

  const watchAll = () => navigate('/reels?tab=trending');

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trending reels</CardTitle>
          <p className="text-xs text-muted-foreground font-normal">Loading from all vendors…</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="shrink-0 w-[108px] sm:w-[128px] rounded-xl overflow-hidden border bg-muted animate-pulse"
              >
                <div className="aspect-[9/16] bg-muted-foreground/20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || reels.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Trending reels</CardTitle>
            <Button variant="outline" size="sm" type="button" onClick={watchAll}>
              Watch all <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground py-4">
            {isError ? 'Could not load reels.' : 'No reels to show yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Trending reels</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={watchAll}>
              Watch all <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-normal">
          From all vendors. Tap a reel to open the feed and watch.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
          {reels.map((reel) => (
            <button
              key={reel.id}
              type="button"
              onClick={() => openReel(reel)}
              className="group relative shrink-0 w-[108px] sm:w-[128px] rounded-xl overflow-hidden border bg-muted text-left hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="relative aspect-[9/16]">
                <img
                  src={reel.thumbnail || reel.product.image}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-80 group-hover:opacity-95 transition-opacity">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55">
                    <Play className="h-3.5 w-3.5 text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 space-y-0.5">
                  <p className="text-[9px] text-white font-medium line-clamp-1 flex items-center gap-0.5">
                    {reel.vendor.name}
                    {reel.vendor.verified && (
                      <BadgeCheck className="w-3 h-3 shrink-0 text-sky-400" aria-hidden />
                    )}
                  </p>
                  <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[9px] text-white/80">
                    <span className="inline-flex items-center gap-0.5">
                      <Eye className="h-2.5 w-2.5" />
                      {formatReelCount(reel.views)}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <Heart className="h-2.5 w-2.5" />
                      {formatReelCount(reel.likes)}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      <MessageCircle className="h-2.5 w-2.5" />
                      {formatReelCount(reel.commentsCount ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PortalDashboardReelsStrip;
