import React from 'react';
import ReelCard from './ReelCard';
import type { ReelCardVariant } from './ReelCard';
import ReelCommentDrawer from './ReelCommentDrawer';
import AddedToCartToast from './AddedToCartToast';
import type { ReelFeedControllerApi } from './useReelFeedController';
import type { Reel } from '../types';

export type ReelsPlaybackProgressProps = {
  /** 0–100 for the active reel (drives the top progress bar). */
  activeProgress: number;
  onProgress: (progress: number) => void;
  /** Fires once when the active reel reaches end-of-clip (e.g. advance to next). */
  onComplete?: () => void;
};

export type ReelsVerticalFeedProps = {
  displayReels: Reel[];
  activeIndex: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  ctl: ReelFeedControllerApi;
  embedded?: boolean;
  className?: string;
  showCartToast?: boolean;
  onViewCart?: () => void;
  /** When set, wires MP4 + TikTok progress into ReelCard (same pattern as vendor viewer). */
  playbackProgress?: ReelsPlaybackProgressProps;
  variant?: ReelCardVariant;
};

/**
 * Shared TikTok-style vertical reel stack: ReelCard, interactions, comment drawer, cart toast.
 * Parent must call useReelFeedController + useReelViewRecording and pass ctl.
 */
const ReelsVerticalFeed: React.FC<ReelsVerticalFeedProps> = ({
  displayReels,
  activeIndex,
  containerRef,
  onScroll,
  ctl,
  embedded = false,
  className = '',
  showCartToast = true,
  onViewCart,
  playbackProgress,
  variant = 'default',
}) => {
  const immersive = variant === 'immersive';
  const scrollClass = embedded
    ? 'reels-snap-container reels-embed-portal rounded-xl overflow-hidden border border-border'
    : 'reels-snap-container';

  return (
    <>
      <div ref={containerRef} className={`${scrollClass} ${className}`.trim()} onScroll={onScroll}>
        {displayReels.map((reel, index) => {
          const dist = Math.abs(index - activeIndex);
          const mountVideo = !immersive || dist <= 1;
          const videoPreload: 'auto' | 'metadata' | 'none' = immersive
            ? index === activeIndex
              ? 'auto'
              : dist === 1
                ? 'metadata'
                : 'none'
            : 'auto';

          return (
            <ReelCard
              key={reel.id}
              reel={reel}
              variant={variant}
              mountVideo={mountVideo}
              videoPreload={videoPreload}
              isActive={index === activeIndex}
              isMuted={ctl.isMuted || index !== activeIndex}
              onToggleMute={ctl.handleToggleMute}
              onAddToCart={ctl.handleAddToCart}
              onBuyNow={ctl.handleBuyNow}
              onToggleLike={ctl.handleLike}
              onToggleBookmark={ctl.handleBookmark}
              onShare={ctl.handleShare}
              onComment={ctl.handleComment}
              progress={
                playbackProgress && !immersive
                  ? index === activeIndex
                    ? playbackProgress.activeProgress
                    : 0
                  : undefined
              }
              onProgress={
                playbackProgress && !immersive && index === activeIndex
                  ? playbackProgress.onProgress
                  : undefined
              }
              onProgressComplete={
                playbackProgress && !immersive && index === activeIndex
                  ? playbackProgress.onComplete
                  : undefined
              }
            />
          );
        })}
      </div>
      {showCartToast && !immersive && (
        <AddedToCartToast
          isVisible={ctl.showToast}
          onViewCart={onViewCart ?? (() => ctl.navigate('/checkout'))}
          onDismiss={() => ctl.setShowToast(false)}
        />
      )}
      {!immersive && (
        <ReelCommentDrawer
          reelId={ctl.commentDrawerReelId}
          open={ctl.commentDrawerReelId != null}
          onClose={() => ctl.setCommentDrawerReelId(null)}
          onCommentAdded={() => {
            if (ctl.commentDrawerReelId == null) return;
            ctl.patchReel(ctl.commentDrawerReelId, (r) => ({ ...r, commentsCount: (r.commentsCount ?? 0) + 1 }));
          }}
        />
      )}
    </>
  );
};

export default ReelsVerticalFeed;
