import { X, Minus, Plus, ShoppingBag, Trash2, CheckCircle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from 'react-router-dom';
import { isStorefrontCustomerSession } from '@/lib/api';

const CartDrawer = () => {
  const { 
    cartItems, 
    cartCount, 
    cartTotal, 
    isCartOpen, 
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    lastAddedProduct
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const formatPrice = (price: number) => `Rs. ${price.toLocaleString('en-NP')}`;

  if (!isCartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />
      
      {/* Popup - Small on mobile, drawer on desktop */}
      <div className={cn(
        "fixed z-50 bg-card shadow-2xl animate-fade-in",
        // Mobile: bottom popup above footer, smaller height
        "bottom-[80px] left-2 right-2 max-h-[70vh] rounded-2xl",
        // Desktop: right drawer, full height
        "md:bottom-auto md:top-0 md:left-auto md:right-0 md:h-full md:w-full md:max-w-md md:rounded-none md:rounded-l-2xl md:animate-slide-in-right"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
          <div className="flex items-center gap-2 text-category-fresh">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-semibold text-sm md:text-base">Added to Cart</span>
          </div>
          <button 
            onClick={() => setIsCartOpen(false)}
            className="p-1.5 md:p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="overflow-y-auto max-h-[calc(70vh-132px)] md:max-h-[calc(100vh-160px)] p-3 md:p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-base font-medium">Your cart is empty</p>
              <p className="text-xs">Add items to get started</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.cartItemId ?? item.product.id}
                className={cn(
                  "flex gap-3 p-3 md:gap-3 md:p-3 bg-muted/50 rounded-xl transition-all",
                  lastAddedProduct?.id === item.product.id && "ring-2 ring-category-fresh animate-pulse"
                )}
              >
                {/* Product Image */}
                <div className="w-16 h-16 md:w-16 md:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img 
                    src={item.product.image} 
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm md:text-sm line-clamp-2 mb-1">
                    {item.product.name}
                  </h4>
                  {item.product.unit && (
                    <p className="text-xs md:text-sm text-muted-foreground mb-1">
                      {item.product.unit} ×{item.quantity}
                    </p>
                  )}
                  
                  {/* Price */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-category-fresh text-sm md:text-base">
                      {formatPrice(item.product.price)}
                    </span>
                    {item.product.originalPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(item.product.originalPrice)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-0.5 bg-category-fresh rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 md:p-1.5 text-white hover:bg-white/20 transition-colors"
                    >
                      <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                    <span className="px-2 md:px-2 text-white font-bold text-sm md:text-sm min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 md:p-1.5 text-white hover:bg-white/20 transition-colors"
                    >
                      <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="p-3 md:p-4 bg-card border-t border-border">
            <button 
              onClick={() => {
                setIsCartOpen(false);
                if (!isStorefrontCustomerSession()) {
                  navigate('/login', { state: { from: '/checkout' } });
                  return;
                }
                navigate('/checkout', { state: { from: `${location.pathname}${location.search}` } });
              }}
              className="w-full py-2.5 md:py-3.5 bg-category-fresh hover:bg-category-fresh/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
            >
              Go to Cart
              <span className="text-xs md:text-sm opacity-80">
                ({cartCount} items • {formatPrice(cartTotal)})
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
