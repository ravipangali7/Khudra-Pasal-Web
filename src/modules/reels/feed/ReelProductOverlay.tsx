import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ReelsPriceTag from '../shared/ReelsPriceTag';
import ReelsAvatar from '../shared/ReelsAvatar';
import ReelsButton from '../shared/ReelsButton';
import type { Reel } from '../types';

interface ReelProductOverlayProps {
  reel: Reel;
  /** Full-screen /reels: extra padding for floating action rail + mobile tab bar. */
  immersive?: boolean;
  onProductTap: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  expanded: boolean;
  onToggleCaption: () => void;
}

const ReelProductOverlay: React.FC<ReelProductOverlayProps> = ({
  reel,
  immersive = false,
  onProductTap,
  onAddToCart,
  onBuyNow,
  expanded,
  onToggleCaption,
}) => {
  const navigate = useNavigate();
  const storeSlug = reel.vendor.storeSlug;
  const { product, vendor, caption } = reel;
  const productLinked = Boolean(reel.product?.id);

  const captionText = (caption ?? '').trim();
  const hasCaption = captionText.length > 0;

  const captionRef = useRef<HTMLParagraphElement>(null);
  const [captionOverflows, setCaptionOverflows] = useState(false);

  useLayoutEffect(() => {
    if (!hasCaption) {
      setCaptionOverflows(false);
      return;
    }
    if (expanded) {
      return;
    }
    const el = captionRef.current;
    if (!el) {
      return;
    }
    setCaptionOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [hasCaption, expanded, captionText]);

  const padClass = immersive ? 'p-4 pr-16 md:pr-4' : 'p-4';

  const paddingBottom = immersive
    ? hasCaption
      ? 'var(--reels-overlay-bottom)'
      : 'var(--reels-overlay-bottom-compact)'
    : hasCaption
      ? 'max(1.5rem, var(--reels-safe-bottom))'
      : 'max(1rem, var(--reels-safe-bottom))';

  const captionId = `reel-caption-${reel.id}`;
  const showCaptionToggle = expanded || captionOverflows;

  return (
    <motion.div
      className={`absolute bottom-0 left-0 right-0 z-[4] ${padClass}`}
      style={{
        background: 'var(--reels-overlay-gradient)',
        paddingBottom,
      }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.3 }}
    >
      {/* Product info */}
      <div className="flex items-start gap-3 mb-3 cursor-pointer" onClick={onProductTap}>
        <img
          src={product.image}
          alt={product.name}
          className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border"
          style={{ borderColor: 'var(--reels-glass-border)' }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="reels-font-display font-bold text-white text-sm truncate">{product.name}</h3>
          <ReelsPriceTag price={product.price} originalPrice={product.originalPrice} discount={product.discount} size="sm" />
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="reels-font-body text-[11px]" style={{ color: 'var(--reels-text-secondary)' }}>In Stock</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <ReelsButton
          variant="cart"
          onClick={onAddToCart}
          className="flex-[55] px-4 text-sm"
          disabled={!productLinked}
        >
          🛒 Add to Cart
        </ReelsButton>
        <ReelsButton
          variant="buy"
          onClick={onBuyNow}
          className="flex-[45] px-4 text-sm"
          disabled={!productLinked}
        >
          ⚡ Buy Now
        </ReelsButton>
      </div>

      {/* Vendor */}
      <div className={hasCaption ? 'mb-2' : ''}>
        {storeSlug ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/store/${encodeURIComponent(storeSlug)}`);
            }}
            className="flex w-full text-left rounded-lg p-1 -m-1 hover:bg-white/5 transition-colors"
          >
            <ReelsAvatar name={vendor.name} verified={vendor.verified} avatar={vendor.avatar} />
          </button>
        ) : (
          <ReelsAvatar name={vendor.name} verified={vendor.verified} avatar={vendor.avatar} />
        )}
      </div>

      {hasCaption ? (
        <div>
          <p
            ref={captionRef}
            id={captionId}
            className={`reels-font-body text-xs leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}
            style={{ color: 'var(--reels-text-secondary)' }}
          >
            {captionText}
          </p>
          {showCaptionToggle ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={captionId}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCaption();
              }}
              className="reels-font-body text-xs font-semibold mt-0.5"
              style={{ color: 'var(--reels-text-primary)' }}
            >
              {expanded ? 'See less' : 'See more'}
            </button>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
};

export default ReelProductOverlay;
