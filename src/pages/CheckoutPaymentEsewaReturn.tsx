import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { portalApi, isStorefrontCustomerSession, getCheckoutPlacedPortal } from '@/lib/api';
import { CHECKOUT_ESEWA_ORDER_NUMBERS_KEY } from '@/lib/checkoutGateway';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

/**
 * eSewa sandbox redirects here with ?data=<base64 JSON> on success.
 */
export default function CheckoutPaymentEsewaReturn() {
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [message, setMessage] = useState('Verifying eSewa payment…');

  useEffect(() => {
    if (!isStorefrontCustomerSession()) {
      navigate('/login', { replace: true, state: { from: '/checkout/payment/esewa/return' } });
      return;
    }

    const data = searchParams.get('data')?.trim();
    let rawOrders = sessionStorage.getItem(CHECKOUT_ESEWA_ORDER_NUMBERS_KEY);
    let orderNumbers: string[] = [];
    try {
      if (rawOrders) {
        const parsed = JSON.parse(rawOrders) as unknown;
        if (Array.isArray(parsed)) {
          orderNumbers = parsed.map((x) => String(x).trim()).filter(Boolean);
        }
      }
    } catch {
      orderNumbers = [];
    }

    if (!data && !searchParams.get('transaction_uuid')) {
      setState('error');
      setMessage('Missing payment data from eSewa. You can check your orders in your account.');
      return;
    }

    if (!orderNumbers.length) {
      setState('error');
      setMessage(
        'Could not restore your order list after returning from eSewa. Check your orders in your account.',
      );
      return;
    }

    void (async () => {
      try {
        await portalApi.checkoutPaymentEsewaVerify({
          order_numbers: orderNumbers,
          ...(data ? { data } : {}),
          ...(!data && searchParams.get('transaction_uuid')
            ? { transaction_uuid: searchParams.get('transaction_uuid')! }
            : {}),
        });
        sessionStorage.removeItem(CHECKOUT_ESEWA_ORDER_NUMBERS_KEY);
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
        sessionStorage.removeItem(CHECKOUT_ESEWA_ORDER_NUMBERS_KEY);
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
