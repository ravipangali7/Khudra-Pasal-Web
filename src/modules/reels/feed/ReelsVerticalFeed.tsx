import React from 'react';
import ReelCard from './ReelCard';
import type { ReelCardVariant } from './ReelCard';
import ReelActionsSidebar from './ReelActionsSidebar';
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
  const scrollClassImmersive = embedded
    ? 'reels-snap-container reels-embed-portal rounded-xl overflow-hidden border border-border'
    : `reels-snap-container ${className}`.trim();
  const scrollClassWithRail = embedded
    ? 'reels-snap-container reels-embed-portal overflow-hidden'
    : `reels-snap-container min-h-0 min-w-0 flex-1 ${className}`.trim();

  const safeIndex =
    displayReels.length === 0 ? 0 : Math.min(Math.max(0, activeIndex), displayReels.length - 1);
  const activeReel = displayReels[safeIndex];
  const railDisabled = displayReels.length === 0;

  const shellClass =
    embedded && !immersive
      ? 'flex h-[min(70vh,600px)] max-h-[600px] min-h-0 w-full flex-row rounded-xl overflow-hidden border border-border'
      : !immersive
        ? 'flex h-full min-h-0 w-full flex-row'
        : '';

  const reelCards = displayReels.map((reel, index) => {
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
        progress={
          playbackProgress
            ? index === activeIndex
              ? playbackProgress.activeProgress
              : 0
            : undefined
        }
        onProgress={
          playbackProgress && index === activeIndex ? playbackProgress.onProgress : undefined
        }
        onProgressComplete={
          playbackProgress && index === activeIndex ? playbackProgress.onComplete : undefined
        }
      />
    );
  });

  return (
    <>
      {immersive ? (
        <div className="relative h-full w-full min-h-0">
          <div ref={containerRef} className={scrollClassImmersive} onScroll={onScroll}>
            {reelCards}
          </div>
          {activeReel ? (
            <ReelActionsSidebar
              layout="floating"
              className="absolute z-[45] right-1 top-[40%] -translate-y-1/2 sm:right-2"
              disabled={railDisabled}
              views={activeReel.views}
              likes={activeReel.likes}
              commentsCount={activeReel.commentsCount}
              liked={activeReel.liked}
              saved={activeReel.bookmarked}
              onLike={() => ctl.handleLike(activeReel)}
              onSave={() => ctl.handleBookmark(activeReel)}
              onShare={() => ctl.handleShare(activeReel)}
              onComment={() => ctl.handleComment(activeReel)}
            />
          ) : null}
        </div>
      ) : (
        <div className={shellClass}>
          <div ref={containerRef} className={scrollClassWithRail} onScroll={onScroll}>
            {reelCards}
          </div>
          {activeReel ? (
            <ReelActionsSidebar
              className={embedded ? 'rounded-r-xl' : ''}
              disabled={railDisabled}
              views={activeReel.views}
              likes={activeReel.likes}
              commentsCount={activeReel.commentsCount}
              liked={activeReel.liked}
              saved={activeReel.bookmarked}
              onLike={() => ctl.handleLike(activeReel)}
              onSave={() => ctl.handleBookmark(activeReel)}
              onShare={() => ctl.handleShare(activeReel)}
              onComment={() => ctl.handleComment(activeReel)}
            />
          ) : null}
        </div>
      )}
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
