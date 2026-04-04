import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ReelVideoPlayer from './ReelVideoPlayer';
import ReelProductOverlay from './ReelProductOverlay';
import ReelProgressBar from './ReelProgressBar';
import ProductQuickSheet from './ProductQuickSheet';
import SponsoredLabel from './SponsoredLabel';
import type { Reel } from '../types';

export type ReelCardVariant = 'default' | 'immersive';

interface ReelCardProps {
  reel: Reel;
  isActive: boolean;
  onAddToCart: (reel: Reel) => void;
  onBuyNow?: (reel: Reel, quantity?: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  progress?: number;
  onProgress?: (progress: number) => void;
  onProgressComplete?: () => void;
  variant?: ReelCardVariant;
  /** When false, show poster only (performance: active ±1 window). */
  mountVideo?: boolean;
  /** Passed to MP4 preload when mountVideo. */
  videoPreload?: 'auto' | 'metadata' | 'none';
}

const ReelCard: React.FC<ReelCardProps> = ({
  reel,
  isActive,
  onAddToCart,
  onBuyNow,
  isMuted: controlledIsMuted,
  onToggleMute,
  progress,
  onProgress,
  onProgressComplete,
  variant = 'default',
  mountVideo = true,
  videoPreload = 'auto',
}) => {
  const [localIsMuted, setLocalIsMuted] = useState(true);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMuted = controlledIsMuted ?? localIsMuted;
  const handleToggleMute = onToggleMute ?? (() => setLocalIsMuted((prev) => !prev));
  const immersive = variant === 'immersive';

  const posterSrc = reel.thumbnail || reel.product?.image;

  return (
    <motion.div
      className={`reels-snap-item${immersive ? ' reels-snap-item--immersive' : ''}`}
      style={{
        outline: !immersive && isActive ? '2px solid rgba(255,255,255,0.25)' : 'none',
        outlineOffset: '-2px',
      }}
      initial={immersive ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={immersive ? { duration: 0 } : { duration: 0.2 }}
    >
      {!immersive && (
        <ReelProgressBar isActive={isActive} progress={progress} onComplete={onProgressComplete} />
      )}

      {mountVideo ? (
        <ReelVideoPlayer
          videoUrl={reel.videoUrl}
          platform={reel.platform}
          isActive={isActive}
          isMuted={isMuted}
          onProgress={immersive ? undefined : onProgress}
          thumbnail={reel.thumbnail}
          minimalChrome={immersive}
          preload={videoPreload}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'var(--reels-bg)' }}>
          {posterSrc ? (
            <img src={posterSrc} alt="" className="w-full h-full object-cover opacity-40" />
          ) : null}
        </div>
      )}

      {!immersive && (
        <>
          <div
            className="absolute top-0 left-0 right-0 h-[15%] z-[3]"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
          />

          {reel.status === 'active' && reel.id % 2 === 0 && <SponsoredLabel />}
        </>
      )}

      <button
        type="button"
        onClick={handleToggleMute}
        className={`absolute z-[30] w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md ${
          immersive ? 'bottom-6 left-4' : 'bottom-28 left-4'
        }`}
        style={{ background: 'var(--reels-glass)', border: '1px solid var(--reels-glass-border)' }}
        aria-label={isMuted ? 'Enable sound' : 'Mute sound'}
        title={isMuted ? 'Enable sound' : 'Mute sound'}
      >
        <span className="text-sm">{isMuted ? '🔇' : '🔊'}</span>
      </button>

      {!immersive && (
        <>
          <ReelProductOverlay
            reel={reel}
            onProductTap={() => setSheetOpen(true)}
            onAddToCart={() => onAddToCart(reel)}
            onBuyNow={() => onBuyNow?.(reel, 1)}
            expanded={captionExpanded}
            onToggleCaption={() => setCaptionExpanded(!captionExpanded)}
          />

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
        </>
      )}
    </motion.div>
  );
};

export default ReelCard;
