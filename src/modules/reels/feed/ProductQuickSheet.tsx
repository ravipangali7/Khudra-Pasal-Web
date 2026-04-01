import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Minus, Plus } from 'lucide-react';
import type { ReelProduct } from '../types';
import ReelsPriceTag from '../shared/ReelsPriceTag';
import ReelsButton from '../shared/ReelsButton';

interface ProductQuickSheetProps {
  product: ReelProduct;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: () => void;
  onBuyNow?: (quantity: number) => void;
  /** When false (e.g. API had no linked product), commerce buttons are disabled. */
  hasLinkedProduct?: boolean;
}

const ProductQuickSheet: React.FC<ProductQuickSheetProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
  hasLinkedProduct = true,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[50] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[51] overflow-y-auto"
            style={{
              background: 'var(--reels-surface)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid var(--reels-glass-border)',
              borderBottom: 'none',
              maxHeight: '75dvh'
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--reels-text-muted)' }} />
            </div>

            {/* Close */}
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-full" style={{ background: 'var(--reels-glass)' }}>
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="px-5 pb-4">
              {/* Product image */}
              <div className="w-full h-[280px] rounded-xl overflow-hidden mb-4" style={{ background: 'var(--reels-card)' }}>
                <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
              </div>

              {/* Name */}
              <h2 className="reels-font-display font-bold text-xl text-white mb-2">{product.name}</h2>

              {/* Price */}
              <div className="mb-3">
                <ReelsPriceTag price={product.price} originalPrice={product.originalPrice} discount={product.discount} size="lg" />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                  ))}
                </div>
                <span className="reels-font-body text-sm" style={{ color: 'var(--reels-text-secondary)' }}>
                  {product.rating} ({product.reviews} reviews)
                </span>
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-4">
                  <p className={`reels-font-body text-sm leading-relaxed ${expanded ? '' : 'line-clamp-3'}`} style={{ color: 'var(--reels-text-secondary)' }}>
                    {product.description}
                  </p>
                  <button onClick={() => setExpanded(!expanded)} className="reels-font-body text-xs font-semibold mt-1" style={{ color: 'var(--reels-accent)' }}>
                    {expanded ? 'Show less' : 'Read more'}
                  </button>
                </div>
              )}

              {/* Variants */}
              {product.variants?.map(v => (
                <div key={v.type} className="mb-4">
                  <p className="reels-font-body text-xs font-semibold text-white mb-2">{v.type}</p>
                  <div className="flex flex-wrap gap-2">
                    {v.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setSelectedVariants(prev => ({ ...prev, [v.type]: opt }))}
                        className="px-3 py-1.5 rounded-lg reels-font-body text-xs font-medium transition-all"
                        style={{
                          background: selectedVariants[v.type] === opt ? 'var(--reels-accent)' : 'var(--reels-glass)',
                          color: 'var(--reels-text-primary)',
                          border: `1px solid ${selectedVariants[v.type] === opt ? 'var(--reels-accent)' : 'var(--reels-glass-border)'}`,
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className="flex items-center gap-4 mb-6">
                <span className="reels-font-body text-sm text-white">Quantity</span>
                <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--reels-glass-border)' }}>
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 hover:bg-white/10"><Minus className="w-4 h-4 text-white" /></button>
                  <span className="reels-font-mono text-sm text-white px-4">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="p-2 hover:bg-white/10"><Plus className="w-4 h-4 text-white" /></button>
                </div>
              </div>
            </div>

            {/* Sticky bottom */}
            <div className="sticky bottom-0 px-5 pb-6 pt-3 flex gap-3" style={{ background: 'var(--reels-surface)', borderTop: '1px solid var(--reels-border)' }}>
              <ReelsButton variant="cart" onClick={onAddToCart} className="flex-1 text-sm" disabled={!hasLinkedProduct}>
                🛒 Add to Cart
              </ReelsButton>
              <ReelsButton variant="buy" onClick={() => onBuyNow?.(quantity)} className="flex-1 text-sm" disabled={!hasLinkedProduct}>
                ⚡ Buy Now
              </ReelsButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductQuickSheet;
