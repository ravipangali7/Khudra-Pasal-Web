import React from 'react';
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

  const padClass = immersive ? 'p-4 pr-16 md:pr-4' : 'p-4';

  return (
    <motion.div
      className={`absolute bottom-0 left-0 right-0 z-[4] ${padClass}`}
      style={{
        background: 'var(--reels-overlay-gradient)',
        paddingBottom: immersive ? 'var(--reels-overlay-bottom)' : 'max(1.5rem, var(--reels-safe-bottom))',
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
      <div className="mb-2">
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

      {/* Caption */}
      <div>
        <p
          className={`reels-font-body text-xs leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}
          style={{ color: 'var(--reels-text-secondary)' }}
        >
          {caption}
        </p>
        {caption.length > 80 && (
          <button onClick={onToggleCaption} className="reels-font-body text-xs font-semibold mt-0.5" style={{ color: 'var(--reels-text-primary)' }}>
            {expanded ? 'less' : 'more'}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ReelProductOverlay;
