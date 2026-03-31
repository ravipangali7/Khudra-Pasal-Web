import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

interface AddedToCartToastProps {
  isVisible: boolean;
  onViewCart: () => void;
  onDismiss: () => void;
}

const AddedToCartToast: React.FC<AddedToCartToastProps> = ({ isVisible, onViewCart, onDismiss }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-4 left-1/2 z-[60] w-[90%] max-w-sm"
          style={{ transform: 'translateX(-50%)' }}
          initial={{ y: -60, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: -60, opacity: 0, x: '-50%' }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{
              background: 'var(--reels-card)',
              border: '1px solid var(--reels-glass-border)',
              borderLeft: '3px solid #4CAF50'
            }}
          >
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="reels-font-body text-sm font-semibold text-white">Added to cart!</p>
            </div>
            <div className="flex gap-2">
              <button onClick={onViewCart} className="reels-font-body text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ color: 'var(--reels-accent)' }}>
                View Cart ↗
              </button>
              <button onClick={onDismiss} className="reels-font-body text-xs px-2 py-1.5 rounded-lg" style={{ color: 'var(--reels-text-muted)' }}>
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddedToCartToast;
