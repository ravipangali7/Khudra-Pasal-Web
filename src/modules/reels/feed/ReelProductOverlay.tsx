import React from 'react';
import { motion } from 'framer-motion';
import ReelsPriceTag from '../shared/ReelsPriceTag';
import ReelsAvatar from '../shared/ReelsAvatar';
import ReelsButton from '../shared/ReelsButton';
import type { Reel } from '../types';

interface ReelProductOverlayProps {
  reel: Reel;
  onProductTap: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  expanded: boolean;
  onToggleCaption: () => void;
}

const ReelProductOverlay: React.FC<ReelProductOverlayProps> = ({
  reel, onProductTap, onAddToCart, onBuyNow, expanded, onToggleCaption
}) => {
  const { product, vendor, caption } = reel;

  return (
    <motion.div
      className="absolute bottom-0 left-0 right-0 p-4 pb-20 md:pb-6 z-[4]"
      style={{ background: 'var(--reels-overlay-gradient)' }}
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

      {/* Caption */}
      <div className="mb-2">
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

      {/* Vendor */}
      <div className="mb-3">
        <ReelsAvatar name={vendor.name} verified={vendor.verified} avatar={vendor.avatar} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <ReelsButton variant="cart" onClick={onAddToCart} className="flex-[55] px-4 text-sm">
          🛒 Add to Cart
        </ReelsButton>
        <ReelsButton variant="buy" onClick={onBuyNow} className="flex-[45] px-4 text-sm">
          ⚡ Buy Now
        </ReelsButton>
      </div>
    </motion.div>
  );
};

export default ReelProductOverlay;
