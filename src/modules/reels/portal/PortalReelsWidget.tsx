import React, { useMemo } from 'react';
import { Play, Eye, Heart, Share2, ExternalLink, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { extractResults, websiteApiReelsTrendingPreferDirectMp4 } from '@/lib/api';
import { mapApiReelToUi } from '../api/reelMappers';
import { useReelsQueryAuthRev } from '../feed/useReelsQueryAuthRev';
import type { Reel } from '../types';

const formatCount = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n.toString();

function cardImage(reel: Reel): string {
  if (reel.thumbnail) return reel.thumbnail;
  return reel.product.image;
}

function captionLine(reel: Reel): string {
  const c = reel.caption?.trim();
  if (c) return c;
  return reel.product.name;
}

interface PortalReelsWidgetProps {
  variant: 'customer' | 'family' | 'child';
}

/** Self-contained widget to embed in any portal page */
const PortalReelsWidget: React.FC<PortalReelsWidgetProps> = ({ variant }) => {
  const navigate = useNavigate();
  const reelsAuthRev = useReelsQueryAuthRev();
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'reels-trending', variant, reelsAuthRev],
    queryFn: () => websiteApiReelsTrendingPreferDirectMp4({ page_size: 32 }),
  });
  const reels = useMemo(() => extractResults(data).map(mapApiReelToUi), [data]);

  const titles: Record<string, string> = {
    customer: '🎬 Trending Reels',
    family: '🎬 Family-Safe Reels',
    child: '🎬 Reels For You',
  };

  const openReel = (reel: Reel) => {
    navigate(`/reels?tab=trending&reel=${reel.id}`);
  };

  const watchAll = () => {
    navigate('/reels?tab=trending');
  };

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{titles[variant]}</h3>
        <button
          type="button"
          onClick={watchAll}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Watch All <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {isLoading && (
        <div className="flex gap-3 overflow-hidden md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[42vw] max-w-[160px] md:max-w-none md:w-auto animate-pulse"
            >
              <div className="aspect-[9/16] rounded-xl bg-muted" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && reels.length === 0 && (
        <p className="text-xs text-muted-foreground py-6 text-center">No reels to show yet.</p>
      )}

      {!isLoading && reels.length > 0 && (
        <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto md:overflow-visible pb-2 -mx-1 px-1 md:mx-0 md:px-0 snap-x snap-mandatory">
          {reels.map((reel) => (
            <button
              type="button"
              key={reel.id}
              onClick={() => openReel(reel)}
              className="group text-left flex-shrink-0 w-[42vw] max-w-[160px] md:max-w-none md:w-auto snap-start rounded-xl overflow-hidden border bg-background hover:border-primary/50 transition-all hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="relative aspect-[9/16] bg-muted">
                <img
                  src={cardImage(reel)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25 opacity-70 group-hover:opacity-90 transition-opacity flex items-center justify-center pointer-events-none">
                  <div className="w-11 h-11 rounded-full bg-black/55 flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-left">
                  <p className="text-[10px] text-white font-medium line-clamp-2 leading-tight">{captionLine(reel)}</p>
                  <p className="text-[9px] text-white/85 mt-1 flex items-center gap-1 truncate">
                    {reel.vendor.name}
                    {reel.vendor.verified && (
                      <BadgeCheck className="w-3 h-3 shrink-0 text-sky-400" aria-hidden />
                    )}
                  </p>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
                    <span className="flex items-center gap-0.5 text-[9px] text-white/75">
                      <Eye className="w-2.5 h-2.5 shrink-0" />
                      {formatCount(reel.views)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] text-white/75">
                      <Heart className="w-2.5 h-2.5 shrink-0" />
                      {formatCount(reel.likes)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[9px] text-white/75">
                      <Share2 className="w-2.5 h-2.5 shrink-0" />
                      {formatCount(reel.shares ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {variant === 'family' && (
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Parental Control:</strong> Reels shown to child accounts are filtered based on your family safety settings.
          </p>
        </div>
      )}

      {variant === 'child' && (
        <div className="mt-4 rounded-lg bg-primary/5 border border-primary/10 p-3">
          <p className="text-xs text-muted-foreground">
            💡 <strong className="text-foreground">Tip:</strong> Tap any reel to watch and shop directly! Your purchases require parent approval.
          </p>
        </div>
      )}
    </div>
  );
};

export default PortalReelsWidget;
