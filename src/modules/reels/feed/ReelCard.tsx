import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ReelVideoPlayer from './ReelVideoPlayer';
import ReelProductOverlay from './ReelProductOverlay';
import ReelActionsSidebar from './ReelActionsSidebar';
import ReelProgressBar from './ReelProgressBar';
import ProductQuickSheet from './ProductQuickSheet';
import SponsoredLabel from './SponsoredLabel';
import type { Reel } from '../types';

interface ReelCardProps {
  reel: Reel;
  isActive: boolean;
  onAddToCart: (reel: Reel) => void;
  onBuyNow?: (reel: Reel, quantity?: number) => void;
  onToggleLike: (reel: Reel) => void;
  onToggleBookmark: (reel: Reel) => void;
  onShare: (reel: Reel) => void;
  onComment: (reel: Reel) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  progress?: number;
  onProgress?: (progress: number) => void;
  onProgressComplete?: () => void;
}

const ReelCard: React.FC<ReelCardProps> = ({
  reel,
  isActive,
  onAddToCart,
  onBuyNow,
  onToggleLike,
  onToggleBookmark,
  onShare,
  onComment,
  isMuted: controlledIsMuted,
  onToggleMute,
  progress,
  onProgress,
  onProgressComplete,
}) => {
  const [localIsMuted, setLocalIsMuted] = useState(true);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMuted = controlledIsMuted ?? localIsMuted;
  const handleToggleMute = onToggleMute ?? (() => setLocalIsMuted((prev) => !prev));

  return (
    <motion.div
      className="reels-snap-item"
      style={{ outline: isActive ? '2px solid rgba(255,255,255,0.25)' : 'none', outlineOffset: '-2px' }}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Progress */}
      <ReelProgressBar isActive={isActive} progress={progress} onComplete={onProgressComplete} />

      {/* Video */}
      <ReelVideoPlayer
        videoUrl={reel.videoUrl}
        platform={reel.platform}
        isActive={isActive}
        isMuted={isMuted}
        onProgress={onProgress}
      />

      {/* Top gradient */}
      <div className="absolute top-0 left-0 right-0 h-[15%] z-[3]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }} />

      {/* Sponsored label for boosted reels */}
      {reel.status === 'active' && reel.id % 2 === 0 && <SponsoredLabel />}

      {/* Mute toggle */}
      <button
        type="button"
        onClick={handleToggleMute}
        className="absolute bottom-28 left-4 z-[30] w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md"
        style={{ background: 'var(--reels-glass)', border: '1px solid var(--reels-glass-border)' }}
        aria-label={isMuted ? 'Enable sound' : 'Mute sound'}
        title={isMuted ? 'Enable sound' : 'Mute sound'}
      >
        <span className="text-sm">{isMuted ? '🔇' : '🔊'}</span>
      </button>

      {/* Actions sidebar */}
      <ReelActionsSidebar
        views={reel.views}
        likes={reel.likes}
        commentsCount={reel.commentsCount}
        liked={reel.liked}
        saved={reel.bookmarked}
        onLike={() => onToggleLike(reel)}
        onSave={() => onToggleBookmark(reel)}
        onShare={() => onShare(reel)}
        onComment={() => onComment(reel)}
      />

      {/* Product overlay */}
      <ReelProductOverlay
        reel={reel}
        onProductTap={() => setSheetOpen(true)}
        onAddToCart={() => onAddToCart(reel)}
        onBuyNow={() => onBuyNow?.(reel, 1)}
        expanded={captionExpanded}
        onToggleCaption={() => setCaptionExpanded(!captionExpanded)}
      />

      {/* Product quick sheet */}
      <ProductQuickSheet
        product={reel.product}
        hasLinkedProduct={Boolean(reel.product?.id)}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAddToCart={() => {
          onAddToCart(reel);
          setSheetOpen(false);
        }}
        onBuyNow={(quantity) => {
          onBuyNow?.(reel, quantity);
          setSheetOpen(false);
        }}
      />
    </motion.div>
  );
};

export default ReelCard;
