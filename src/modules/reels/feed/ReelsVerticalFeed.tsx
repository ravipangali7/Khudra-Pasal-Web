import React from 'react';
import ReelCard from './ReelCard';
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
}) => {
  const scrollClass = embedded
    ? 'reels-snap-container reels-embed-portal rounded-xl overflow-hidden border border-border'
    : 'reels-snap-container';

  return (
    <>
      <div ref={containerRef} className={`${scrollClass} ${className}`.trim()} onScroll={onScroll}>
        {displayReels.map((reel, index) => (
          <ReelCard
            key={reel.id}
            reel={reel}
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
              playbackProgress
                ? index === activeIndex
                  ? playbackProgress.activeProgress
                  : 0
                : undefined
            }
            onProgress={
              playbackProgress && index === activeIndex
                ? playbackProgress.onProgress
                : undefined
            }
            onProgressComplete={
              playbackProgress && index === activeIndex ? playbackProgress.onComplete : undefined
            }
          />
        ))}
      </div>
      {showCartToast && (
        <AddedToCartToast
          isVisible={ctl.showToast}
          onViewCart={onViewCart ?? (() => ctl.navigate('/checkout'))}
          onDismiss={() => ctl.setShowToast(false)}
        />
      )}
      <ReelCommentDrawer
        reelId={ctl.commentDrawerReelId}
        open={ctl.commentDrawerReelId != null}
        onClose={() => ctl.setCommentDrawerReelId(null)}
        onCommentAdded={() => {
          if (ctl.commentDrawerReelId == null) return;
          ctl.patchReel(ctl.commentDrawerReelId, (r) => ({ ...r, commentsCount: (r.commentsCount ?? 0) + 1 }));
        }}
      />
    </>
  );
};

export default ReelsVerticalFeed;
