import { ShoppingCart, ChevronRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface FloatingCartProps {
  itemCount?: number;
  totalAmount?: number;
  onClick?: () => void;
}

const FloatingCart = ({ itemCount: propItemCount, totalAmount: propTotalAmount, onClick }: FloatingCartProps) => {
  const { cartCount, cartTotal, setIsCartOpen } = useCart();
  
  const itemCount = propItemCount ?? cartCount;
  const totalAmount = propTotalAmount ?? cartTotal;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsCartOpen(true);
    }
  };

  if (itemCount === 0) return null;

  return (
    <button 
      onClick={handleClick}
      className="fixed z-40 md:hidden left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-2.5 rounded-full text-white font-semibold animate-slide-up"
      style={{ 
        bottom: 'calc(80px + env(safe-area-inset-bottom))',
        background: 'linear-gradient(135deg, hsl(40 94% 56%) 0%, hsl(32 92% 48%) 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
      }}
    >
      <div className="relative">
        <ShoppingCart className="w-5 h-5" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-bold">Cart</span>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
          {itemCount} item{itemCount > 1 ? 's' : ''}
        </span>
      </div>
      <span className="text-sm opacity-90">Rs. {totalAmount.toLocaleString()}</span>
      <ChevronRight className="w-5 h-5" />
    </button>
  );
};

export default FloatingCart;
