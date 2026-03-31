import React from 'react';

interface ReelsPriceTagProps {
  price: number;
  originalPrice?: number;
  discount?: number;
  size?: 'sm' | 'md' | 'lg';
}

const ReelsPriceTag: React.FC<ReelsPriceTagProps> = ({ price, originalPrice, discount, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  };
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`reels-font-mono font-semibold ${sizeClasses[size]}`} style={{ color: 'var(--reels-gold)' }}>
        NPR {price.toLocaleString()}
      </span>
      {originalPrice && originalPrice > price && (
        <span className={`reels-font-mono line-through ${size === 'lg' ? 'text-sm' : 'text-xs'}`} style={{ color: 'var(--reels-text-muted)' }}>
          NPR {originalPrice.toLocaleString()}
        </span>
      )}
      {discount && discount > 0 && (
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--reels-accent)', color: 'var(--reels-text-primary)' }}>
          −{discount}%
        </span>
      )}
    </div>
  );
};

export default ReelsPriceTag;
