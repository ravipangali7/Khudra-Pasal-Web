import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { portalApi, isStorefrontCustomerSession, getCheckoutPlacedPortal } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

/**
 * Khalti sandbox redirects here with ?pidx=… after payment.
 */
export default function CheckoutPaymentKhaltiReturn() {
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Verifying Khalti payment…');

  useEffect(() => {
    if (!isStorefrontCustomerSession()) {
      navigate('/login', { replace: true, state: { from: '/checkout/payment/khalti/return' } });
      return;
    }

    const pidx = searchParams.get('pidx')?.trim();
    if (!pidx) {
      setState('error');
      setMessage('Missing payment reference from Khalti.');
      return;
    }

    void (async () => {
      try {
        await portalApi.checkoutPaymentKhaltiVerify({ pidx });
        clearCart();
        void queryClient.invalidateQueries({ queryKey: ['portal'] });
        toast.success('Payment successful. Your order is confirmed.');
        setState('done');
        const portal = getCheckoutPlacedPortal();
        const path =
          portal === 'portal_family'
            ? '/family-portal'
            : portal === 'portal_child'
              ? '/child-portal'
              : '/portal';
        navigate(path, { replace: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Verification failed.';
        setMessage(msg);
        setState('error');
        toast.error(msg);
      }
    })();
  }, [navigate, queryClient, searchParams]);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-6">
      {state === 'working' ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-category-fresh" />
          <p className="text-muted-foreground">{message}</p>
        </div>
      ) : state === 'error' ? (
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold">Payment verification</h1>
          <p className="text-muted-foreground">{message}</p>
          <Link to="/portal" className="inline-block text-category-fresh font-medium hover:underline">
            Open your account
          </Link>
        </div>
      ) : null}
    </div>
  );
}
