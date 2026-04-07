import React from 'react';
import { motion } from 'framer-motion';

interface ReelsButtonProps {
  variant: 'cart' | 'buy' | 'primary' | 'outline';
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const ReelsButton: React.FC<ReelsButtonProps> = ({ variant, children, onClick, className = '', fullWidth, disabled, loading }) => {
  const baseClasses = 'reels-font-body font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200';
  
  const variantClasses = {
    cart: 'border border-white/80 bg-transparent text-white hover:bg-white hover:text-black h-11',
    buy: 'h-11 text-[color:var(--reels-on-accent)]',
    primary: 'h-11 rounded-xl text-[color:var(--reels-on-accent)]',
    outline: 'border text-white hover:bg-white/10 h-10 rounded-xl'
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    buy: {
      background: 'var(--reels-accent)',
      boxShadow: '0 0 20px var(--reels-accent-glow)',
      color: 'var(--reels-on-accent)',
    },
    primary: { background: 'var(--reels-accent)', color: 'var(--reels-on-accent)' },
    outline: { borderColor: 'var(--reels-glass-border)' },
    cart: {}
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      style={variantStyles[variant]}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <div
          className="w-5 h-5 border-2 rounded-full animate-spin border-[color:var(--reels-on-accent)] border-t-transparent opacity-80"
          aria-hidden
        />
      ) : children}
    </motion.button>
  );
};

export default ReelsButton;
