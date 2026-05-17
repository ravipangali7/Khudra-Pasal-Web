import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

type PortalHeaderCartProps = {
  className?: string;
};

/** Compact cart control for portal sticky headers — icon-only, aligned with other header actions. */
export default function PortalHeaderCart({ className }: PortalHeaderCartProps) {
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn('relative h-9 w-9 shrink-0', className)}
      aria-label="Open shopping cart"
      onClick={() => setIsCartOpen(true)}
    >
      <ShoppingCart className="w-5 h-5" />
      {cartCount > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
          {cartCount > 99 ? '99+' : cartCount}
        </span>
      ) : null}
    </Button>
  );
}
