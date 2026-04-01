import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, MapPin, User, Phone, FileText, CheckCircle, Truck, CreditCard, Shield, Minus, Plus, Trash2, Navigation, Map, Wallet } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';
import {
  getCheckoutPlacedPortal,
  isStorefrontCustomerSession,
  portalApi,
  type PortalCheckoutWalletContext,
  PortalApiError,
} from '@/lib/api';
import { toast } from 'sonner';

type CheckoutStep = 'cart' | 'delivery' | 'payment';

type BuyNowState = {
  productId: number;
  productName: string;
  price: number;
  image?: string;
  quantity?: number;
  reelId?: number;
  sellerId?: number;
};

type CheckoutLocationState = {
  buyNow?: BuyNowState;
  from?: string;
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasStorefrontSession = isStorefrontCustomerSession();
  const queryClient = useQueryClient();
  const { cartItems, cartTotal, cartCount, updateQuantity, removeFromCart, clearCart } = useCart();
  const checkoutState = (location.state as CheckoutLocationState | null) ?? null;
  const buyNow = checkoutState?.buyNow;
  const postCheckoutPath = useMemo(() => {
    const fromPath = checkoutState?.from;
    if (typeof fromPath === 'string' && fromPath.startsWith('/')) {
      return fromPath;
    }
    const placedPortal = getCheckoutPlacedPortal();
    if (placedPortal === 'portal_family') return '/family-portal';
    if (placedPortal === 'portal_child') return '/child-portal';
    return '/portal';
  }, [checkoutState?.from]);
  const [buyNowQuantity, setBuyNowQuantity] = useState(Math.max(1, buyNow?.quantity ?? 1));
  const [step, setStep] = useState<CheckoutStep>(() => (buyNow ? 'delivery' : 'cart'));
  const [wantDelivery, setWantDelivery] = useState(true);
  const [useAutoLocation, setUseAutoLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  /** Storefront checkout accepts KhudraPasal Wallet only; value is fixed for API payloads. */
  const paymentMethod = 'wallet' as const;
  const [placeOrderPending, setPlaceOrderPending] = useState(false);
  const [walletCheckoutCtx, setWalletCheckoutCtx] = useState<PortalCheckoutWalletContext | null>(null);
  const [walletCtxLoading, setWalletCtxLoading] = useState(false);
  /** When null, backend uses default wallet; set when user picks another payable bucket. */
  const [payWalletId, setPayWalletId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    secondaryContact: '',
    areaLocation: '',
    landmark: '',
    notes: '',
    googleMapLink: ''
  });
  /** Last known GPS coords for order + backend (set from saved defaults or "Use current location"). */
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (hasStorefrontSession) return;
    navigate('/login', { replace: true, state: { from: '/checkout' } });
  }, [hasStorefrontSession, navigate]);

  useEffect(() => {
    let cancelled = false;
    if (!hasStorefrontSession) return;
    void (async () => {
      try {
        const d = await portalApi.deliveryDefault();
        if (cancelled) return;
        setFormData((prev) => {
          if (prev.areaLocation || prev.landmark || prev.googleMapLink) return prev;
          return {
            ...prev,
            areaLocation: d.area_location || prev.areaLocation,
            landmark: d.landmark || prev.landmark,
            googleMapLink: d.google_map_link || prev.googleMapLink,
          };
        });
        if (d.latitude != null && d.longitude != null) {
          setDeliveryCoords({ lat: d.latitude, lng: d.longitude });
        }
      } catch {
        // No saved defaults or not authenticated for portal
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasStorefrontSession]);

  useEffect(() => {
    if (!hasStorefrontSession || step !== 'payment') {
      return;
    }
    let cancelled = false;
    setWalletCtxLoading(true);
    void (async () => {
      try {
        const ctx = await portalApi.checkoutWalletContext();
        if (cancelled) return;
        setWalletCheckoutCtx(ctx);
        setPayWalletId(null);
      } catch {
        if (!cancelled) setWalletCheckoutCtx(null);
      } finally {
        if (!cancelled) setWalletCtxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasStorefrontSession, step]);

  const formatPrice = (price: number) => `Rs. ${price.toLocaleString('en-NP')}`;

  const baseSubtotal = buyNow ? buyNow.price * buyNowQuantity : cartTotal;
  const baseCount = buyNow ? buyNowQuantity : cartCount;
  const deliveryFee = baseSubtotal >= 500 ? 0 : 50;
  const totalAmount = baseSubtotal + (wantDelivery ? deliveryFee : 0);

  const effectivePayWallet = useMemo(() => {
    if (!walletCheckoutCtx?.default) return null;
    if (payWalletId == null) return walletCheckoutCtx.default;
    return (
      walletCheckoutCtx.payable_wallets.find((w) => w.id === payWalletId) ?? walletCheckoutCtx.default
    );
  }, [walletCheckoutCtx, payWalletId]);

  const walletPayBlocked =
    walletCtxLoading ||
    !hasStorefrontSession ||
    !walletCheckoutCtx?.default ||
    (effectivePayWallet != null && totalAmount > effectivePayWallet.balance);

  const steps: { key: CheckoutStep; label: string; icon: typeof Truck }[] = [
    { key: 'cart', label: 'Cart', icon: Truck },
    { key: 'delivery', label: 'Delivery', icon: MapPin },
    { key: 'payment', label: 'Payment', icon: CreditCard }
  ];

  const handleAutoLocation = () => {
    if (!hasStorefrontSession) {
      toast.error('Sign in to detect and save your delivery location');
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    if (!('geolocation' in navigator)) {
      toast.error('Location is not supported in this browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        void (async () => {
          try {
            const res = await portalApi.saveDeliveryDefaultFromCoords({
              latitude,
              longitude,
            });
            setFormData((prev) => ({
              ...prev,
              areaLocation: res.area_location,
              landmark: res.landmark,
              googleMapLink: res.google_map_link,
            }));
            setDeliveryCoords({
              lat: res.latitude ?? latitude,
              lng: res.longitude ?? longitude,
            });
            setUseAutoLocation(true);
            setErrors((e) => {
              const next = { ...e };
              delete next.areaLocation;
              return next;
            });
            toast.success('Location detected and saved');
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not resolve address');
          } finally {
            setIsLocating(false);
          }
        })();
      },
      (error) => {
        setIsLocating(false);
        const code = (error as GeolocationPositionError).code;
        if (code === 1) {
          toast.error('Location permission denied. Enable location access or enter the address manually.');
        } else if (code === 2) {
          toast.error('Location unavailable. Try again or enter the address manually.');
        } else if (code === 3) {
          toast.error('Location request timed out. Try again.');
        } else {
          toast.error('Could not get your location');
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const validateDelivery = () => {
    if (!wantDelivery) return true;
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!formData.mobile.trim() || !/^9[0-9]{9}$/.test(formData.mobile)) {
      newErrors.mobile = 'Valid 10-digit mobile required';
    }
    if (!formData.areaLocation.trim()) newErrors.areaLocation = 'Location is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (step === 'cart') {
      setStep('delivery');
    } else if (step === 'delivery') {
      if (validateDelivery()) {
        if (!hasStorefrontSession) {
          toast.error('Sign in to pay with your KhudraPasal Wallet');
          navigate('/login', { state: { from: '/checkout' } });
          return;
        }
        setStep('payment');
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (!hasStorefrontSession) {
      toast.error('Sign in to place an order');
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }

    const items = buyNow
      ? [{ product_id: buyNow.productId, quantity: buyNowQuantity }]
      : cartItems.map((item) => ({
          product_id: parseInt(item.product.id, 10),
          quantity: item.quantity,
        }));

    if (!buyNow && items.some((i) => !Number.isFinite(i.product_id))) {
      toast.error('Invalid cart items');
      return;
    }

    const payload: Record<string, unknown> = {
      items,
      want_delivery: wantDelivery,
      payment_method: paymentMethod,
      notes: formData.notes,
      placed_portal: getCheckoutPlacedPortal(),
    };

    if (
      walletCheckoutCtx?.default &&
      payWalletId != null &&
      payWalletId !== walletCheckoutCtx.default.id
    ) {
      payload.pay_wallet_id = payWalletId;
    }

    if (wantDelivery) {
      payload.delivery = {
        full_name: formData.fullName,
        mobile: formData.mobile,
        secondary_contact: formData.secondaryContact || '',
        area_location: formData.areaLocation,
        landmark: formData.landmark || '',
        google_map_link: formData.googleMapLink || '',
        delivery_notes: formData.notes || '',
        ...(deliveryCoords != null
          ? { latitude: deliveryCoords.lat, longitude: deliveryCoords.lng }
          : {}),
      };
    }

    const walletInsufficient =
      !walletCtxLoading &&
      Boolean(walletCheckoutCtx?.default) &&
      effectivePayWallet != null &&
      totalAmount > effectivePayWallet.balance;
    if (walletInsufficient) {
      toast.error('Insufficient balance');
      return;
    }

    setPlaceOrderPending(true);
    try {
      const res = await portalApi.checkout(payload);
      if (res.requires_payment_confirmation && res.orders?.length) {
        try {
          await portalApi.ordersPaymentComplete(res.orders.map((o) => o.order_number));
        } catch (confirmErr) {
          toast.error(
            confirmErr instanceof Error
              ? confirmErr.message
              : 'Could not confirm payment. Check your orders or try again.',
          );
          clearCart();
          void queryClient.invalidateQueries({ queryKey: ['portal'] });
          navigate(postCheckoutPath, { replace: true });
          return;
        }
      }
      let balanceNote = '';
      try {
        const ctxAfter = await portalApi.checkoutWalletContext();
        if (ctxAfter?.default) {
          setWalletCheckoutCtx(ctxAfter);
          balanceNote = ` Wallet balance: ${formatPrice(ctxAfter.default.balance)}.`;
        }
      } catch {
        // Balance refresh is best-effort; order already succeeded
      }
      const multi = res.orders?.length > 1;
      toast.success(
        (multi
          ? `${res.orders.length} orders placed: ${res.orders.map((o) => o.order_number).join(', ')}`
          : `Order ${res.order_number} placed`) + balanceNote,
      );
      clearCart();
      void queryClient.invalidateQueries({ queryKey: ['portal'] });
      navigate(postCheckoutPath, { replace: true });
    } catch (e) {
      const raw =
        e instanceof PortalApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not place order';
      const insufficient =
        raw === 'Insufficient balance' || /insufficient balance/i.test(raw);
      toast.error(insufficient ? 'Insufficient balance' : raw || 'Could not place order');
    } finally {
      setPlaceOrderPending(false);
    }
  };

  if (!buyNow && cartItems.length === 0 && step === 'cart') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Truck className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">Add items to start shopping</p>
          <Link 
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-category-fresh text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <img src={logo} alt="KhudraPasal" className="h-8 w-auto" />
          <h1 className="font-bold">Checkout</h1>
        </div>

        {/* Progress Steps */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {steps.map((s, index) => (
              <div key={s.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    step === s.key ? "bg-category-fresh text-white" :
                    steps.findIndex(x => x.key === step) > index ? "bg-category-fresh text-white" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {steps.findIndex(x => x.key === step) > index ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <s.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs mt-1 font-medium">{s.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-16 md:w-24 h-0.5 mx-2",
                    steps.findIndex(x => x.key === step) > index ? "bg-category-fresh" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form/Cart */}
          <div className="lg:col-span-2 space-y-6">
            {step === 'cart' && (
              <div className="bg-card rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-bold text-lg mb-4">{buyNow ? 'Buy Now Item' : `Cart Items (${cartCount})`}</h2>
                <div className="space-y-3 md:space-y-4">
                  {buyNow ? (
                    <div className="flex flex-col gap-3 p-3 md:p-4 bg-muted/50 rounded-xl sm:flex-row sm:items-start">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img src={buyNow.image || 'https://placehold.co/80x80/333/fff?text=P'} alt={buyNow.productName} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-base line-clamp-2">{buyNow.productName}</h4>
                        <p className="text-sm text-muted-foreground">Direct checkout from reel</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                          <span className="font-bold text-category-fresh text-base">{formatPrice(buyNow.price * buyNowQuantity)}</span>
                          <div className="flex items-center bg-muted rounded-lg overflow-hidden">
                            <button onClick={() => setBuyNowQuantity((q) => Math.max(1, q - 1))} className="p-2 hover:bg-muted-foreground/10">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="px-3 font-bold text-sm">{buyNowQuantity}</span>
                            <button onClick={() => setBuyNowQuantity((q) => q + 1)} className="p-2 hover:bg-muted-foreground/10">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    cartItems.map((item) => (
                      <div key={item.product.id} className="flex flex-col gap-3 p-3 md:p-4 bg-muted/50 rounded-xl sm:flex-row sm:items-start">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-base line-clamp-2">{item.product.name}</h4>
                          {item.product.unit && (
                            <p className="text-sm text-muted-foreground">{item.product.unit}</p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-category-fresh text-base">{formatPrice(item.product.price * item.quantity)}</span>
                            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                              <div className="flex items-center bg-muted rounded-lg overflow-hidden">
                                <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-2 hover:bg-muted-foreground/10">
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-3 font-bold text-sm">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-2 hover:bg-muted-foreground/10">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Want to Deliver Option */}
                <div className="mt-6 p-4 bg-category-fresh/10 rounded-xl border border-category-fresh/20">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantDelivery}
                      onChange={(e) => setWantDelivery(e.target.checked)}
                      className="w-5 h-5 accent-category-fresh"
                    />
                    <div>
                      <span className="font-medium text-foreground">Want to deliver?</span>
                      <p className="text-sm text-muted-foreground">Uncheck if you want to pick up from store</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {step === 'delivery' && (
              <div className="bg-card rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-bold text-lg mb-4">Delivery Address</h2>

                {wantDelivery ? (
                  <div className="space-y-4">
                    {/* Auto Location Button */}
                    <button
                      type="button"
                      onClick={handleAutoLocation}
                      disabled={isLocating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-category-fresh text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      <Navigation className={cn("w-5 h-5", isLocating && "animate-spin")} />
                      {isLocating ? 'Getting Location...' : useAutoLocation ? 'Location Detected ✓' : 'Use My Current Location'}
                    </button>

                    <div className="relative flex items-center">
                      <div className="flex-1 border-t border-border"></div>
                      <span className="px-4 text-sm text-muted-foreground">or enter manually</span>
                      <div className="flex-1 border-t border-border"></div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <User className="w-4 h-4 inline mr-2" />
                        Full Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={e => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-category-fresh transition-all",
                          errors.fullName ? "border-destructive" : "border-border"
                        )}
                        placeholder="Enter your full name"
                      />
                      {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Phone className="w-4 h-4 inline mr-2" />
                        Mobile Number <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">+977</span>
                        <input
                          type="tel"
                          value={formData.mobile}
                          onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                          className={cn(
                            "w-full pl-16 pr-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-category-fresh transition-all",
                            errors.mobile ? "border-destructive" : "border-border"
                          )}
                          placeholder="98XXXXXXXX"
                        />
                      </div>
                      {errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Phone className="w-4 h-4 inline mr-2" />
                        Secondary Contact (optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.secondaryContact}
                        onChange={e => setFormData(prev => ({ ...prev, secondaryContact: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-category-fresh transition-all"
                        placeholder="Alternative phone number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        Area / Location <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.areaLocation}
                        onChange={e => setFormData(prev => ({ ...prev, areaLocation: e.target.value }))}
                        className={cn(
                          "w-full px-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-category-fresh transition-all",
                          errors.areaLocation ? "border-destructive" : "border-border"
                        )}
                        placeholder="Area name, street, house number"
                      />
                      {errors.areaLocation && <p className="text-xs text-destructive mt-1">{errors.areaLocation}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nearby Landmark (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.landmark}
                        onChange={e => setFormData(prev => ({ ...prev, landmark: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-category-fresh transition-all"
                        placeholder="Near famous place or shop"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Map className="w-4 h-4 inline mr-2" />
                        Google Map Link (optional)
                      </label>
                      <input
                        type="url"
                        value={formData.googleMapLink}
                        onChange={e => setFormData(prev => ({ ...prev, googleMapLink: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-category-fresh transition-all"
                        placeholder="Paste Google Maps link"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <FileText className="w-4 h-4 inline mr-2" />
                        Delivery Notes (optional)
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-category-fresh transition-all min-h-[60px]"
                        placeholder="Any special instructions for delivery"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-category-fresh/10 flex items-center justify-center">
                      <Truck className="w-8 h-8 text-category-fresh" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Self Pickup</h3>
                    <p className="text-muted-foreground">You've chosen to pick up your order from our store</p>
                    <p className="text-sm text-muted-foreground mt-2">Kathmandu, Nepal</p>
                  </div>
                )}
              </div>
            )}

            {step === 'payment' && (
              <div className="bg-card rounded-2xl p-4 md:p-6 shadow-sm">
                <h2 className="font-bold text-lg mb-1">Pay with KhudraPasal Wallet</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Checkout is paid from your wallet balance. Add money in your portal if you need more.
                </p>
                {!hasStorefrontSession ? (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Sign in to use your wallet at checkout.</p>
                    <Link
                      to="/login"
                      state={{ from: '/checkout' }}
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-category-fresh text-white font-semibold text-sm hover:opacity-90"
                    >
                      Sign in
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-category-fresh/30 bg-category-fresh/5">
                      <div className="p-2 rounded-lg bg-category-fresh/15 text-category-fresh shrink-0">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <p className="font-semibold text-foreground">KhudraPasal Wallet</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Total due {formatPrice(totalAmount)} will be deducted when you place the order.
                          </p>
                        </div>
                        {walletCtxLoading ? (
                          <p className="text-sm text-muted-foreground">Loading wallet…</p>
                        ) : !walletCheckoutCtx?.default ? (
                          <p className="text-destructive text-sm">
                            No wallet found. Open your account portal to set up your wallet and add money.
                          </p>
                        ) : (
                          <>
                            {walletCheckoutCtx.payable_wallets.length <= 1 ? (
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {effectivePayWallet?.fund_source ?? walletCheckoutCtx.default.fund_source}
                                </span>
                                <span className="mx-2 text-border">·</span>
                                Available {formatPrice(effectivePayWallet?.balance ?? walletCheckoutCtx.default.balance)}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Pay from
                                </p>
                                {walletCheckoutCtx.payable_wallets.map((w) => (
                                  <label
                                    key={w.id}
                                    className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/40"
                                  >
                                    <input
                                      type="radio"
                                      name="pay_wallet"
                                      className="mt-1 w-4 h-4 accent-category-fresh"
                                      checked={(payWalletId ?? walletCheckoutCtx.default.id) === w.id}
                                      onChange={() =>
                                        setPayWalletId(
                                          w.id === walletCheckoutCtx.default.id ? null : w.id,
                                        )
                                      }
                                    />
                                    <span>
                                      <span className="font-medium block">{w.fund_source}</span>
                                      <span className="text-muted-foreground text-xs">
                                        {formatPrice(w.balance)}
                                      </span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                            {effectivePayWallet != null && totalAmount <= effectivePayWallet.balance ? (
                              <p className="text-xs text-muted-foreground">
                                Balance after this order (estimate){' '}
                                <span className="font-medium text-foreground">
                                  {formatPrice(effectivePayWallet.balance - totalAmount)}
                                </span>
                              </p>
                            ) : null}
                            {effectivePayWallet != null && totalAmount > effectivePayWallet.balance ? (
                              <div className="space-y-1">
                                <p className="text-destructive text-sm font-medium">Insufficient balance</p>
                                <p className="text-muted-foreground text-xs">
                                  {formatPrice(totalAmount)} required — add{' '}
                                  {formatPrice(totalAmount - effectivePayWallet.balance)} or more to this wallet.
                                </p>
                                <Link
                                  to="/portal"
                                  className="inline-block text-xs font-medium text-category-fresh hover:underline"
                                >
                                  Go to portal to add money
                                </Link>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-muted/50 rounded-xl flex items-center gap-3">
                  <Shield className="w-5 h-5 text-category-fresh shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Payment is processed securely from your KhudraPasal Wallet only.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl p-4 md:p-6 shadow-sm sticky top-40">
              <h2 className="font-bold text-lg mb-4">Order Summary</h2>
              
              <div className="space-y-3 pb-4 border-b border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal ({baseCount} items)</span>
                  <span>{formatPrice(baseSubtotal)}</span>
                </div>
                {wantDelivery && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span className={deliveryFee === 0 ? 'text-category-fresh font-medium' : ''}>
                      {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
                    </span>
                  </div>
                )}
                {wantDelivery && baseSubtotal < 500 && (
                  <p className="text-xs text-muted-foreground">
                    Add Rs. {500 - baseSubtotal} more for free delivery
                  </p>
                )}
              </div>

              <div className="flex justify-between py-4 font-bold text-lg">
                <span>Total</span>
                <span className="text-category-fresh">{formatPrice(totalAmount)}</span>
              </div>

              <button
                type="button"
                onClick={step === 'payment' ? () => void handlePlaceOrder() : handleContinue}
                disabled={
                  (step === 'payment' && placeOrderPending) ||
                  (step === 'payment' && walletPayBlocked)
                }
                className="w-full py-4 bg-category-fresh hover:bg-category-fresh/90 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
              >
                {step === 'payment' ? (placeOrderPending ? 'Placing order…' : 'Place Order') : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
