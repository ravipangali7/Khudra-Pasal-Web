import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Plus, Minus, Trash2, User, CreditCard,
  Banknote, Smartphone, QrCode, Receipt, X, Percent, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { adminApi, extractResults, vendorApi } from '@/lib/api';
import { useAdminList } from '@/pages/admin/hooks/useAdminList';
import { useAdminMutation } from '@/pages/admin/hooks/useAdminMutation';
import { resolveMediaUrl } from '@/pages/admin/hooks/adminFormUtils';

interface CartItem {
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    category: string;
    image: string;
  };
  quantity: number;
}

export type POSSystemProps = { variant?: 'admin' | 'vendor' };

export default function POSSystem({ variant = 'admin' }: POSSystemProps) {
  const queryClient = useQueryClient();
  const isVendor = variant === 'vendor';

  const { data: adminProductRows = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'products', 'pos'],
    () => adminApi.products({ page_size: 300 }),
    { enabled: !isVendor },
  );
  const { data: vendorProductPage } = useQuery({
    queryKey: ['vendor', 'products', 'pos'],
    queryFn: () => vendorApi.products({ page_size: 300 }),
    enabled: isVendor,
  });
  const vendorProductRows = isVendor ? extractResults<Record<string, unknown>>(vendorProductPage) : [];

  const productRows = isVendor ? vendorProductRows : adminProductRows;

  const { data: adminUserRows = [] } = useAdminList<{ id: number; name: string; phone: string }>(
    ['admin', 'users', 'pos'],
    () => adminApi.users({ page_size: 200 }),
    { enabled: !isVendor },
  );
  const { data: vendorCustomerPage } = useQuery({
    queryKey: ['vendor', 'customers', 'pos'],
    queryFn: () => vendorApi.customers({ page_size: 200 }),
    enabled: isVendor,
  });
  const vendorCustomerRows = isVendor ? extractResults<Record<string, unknown>>(vendorCustomerPage) : [];

  const userRows = isVendor
    ? vendorCustomerRows.map((c) => ({
        id: Number(c.id),
        name: String(c.name ?? ''),
        phone: String(c.phone ?? ''),
      }))
    : adminUserRows;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<string>('walkin');
  const [customerSearch, setCustomerSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const adminCheckout = useAdminMutation(
    (payload: Parameters<typeof adminApi.createPurchaseOrder>[0]) => adminApi.createPurchaseOrder(payload),
    [['admin', 'purchase-orders', 'po']],
  );

  const vendorCheckout = useMutation({
    mutationFn: (payload: Record<string, unknown>) => vendorApi.posCheckout(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vendor'] });
    },
  });

  const isCheckoutPending = isVendor ? vendorCheckout.isPending : adminCheckout.isPending;

  const products = useMemo(
    () =>
      productRows.map((p) => {
        const raw = (p as { image_url?: string }).image_url;
        const url = raw ? resolveMediaUrl(String(raw)) : '';
        return {
          id: String(p.id),
          name: String(p.name ?? 'Unnamed'),
          sku: String(p.sku ?? ''),
          price: Number(p.price ?? 0),
          stock: Number(p.stock ?? 0),
          category: String(p.category ?? 'Uncategorized'),
          image: url || (isVendor ? '📦' : '📦'),
        };
      }),
    [productRows, isVendor],
  );

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products],
  );
  const registeredCustomers = useMemo(
    () => [
      { id: 'walkin', name: 'Walk-in Customer', phone: '' },
      ...userRows.map((u) => ({ id: String(u.id), name: u.name, phone: u.phone })),
    ],
    [userRows],
  );

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredCustomers = registeredCustomers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const addToCart = (product: CartItem['product']) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxVendor = (subtotal - discountAmount) * 0.13;
  const total = isVendor ? subtotal - discountAmount + taxVendor : subtotal - discountAmount;

  const handlePayment = () => {
    if (!selectedPayment) return;
    const onDone = () => {
      setPaymentModal(false);
      setCart([]);
      setDiscount(0);
      setCustomer('walkin');
      setSelectedPayment(null);
    };
    if (isVendor) {
      const pm =
        selectedPayment === 'cash'
          ? 'cash'
          : selectedPayment === 'card' || selectedPayment === 'qr'
            ? 'card'
            : selectedPayment === 'esewa'
              ? 'esewa'
              : 'cash';
      vendorCheckout.mutate(
        {
          items: cart.map((c) => ({
            product_id: Number(c.product.id),
            quantity: c.quantity,
          })),
          payment_method: pm,
          customer_id: customer === 'walkin' ? undefined : Number(customer),
          tax_percent: 13,
          discount: discountAmount,
          notes: '',
        },
        { onSuccess: onDone },
      );
      return;
    }
    adminCheckout.mutate(
      {
        customer_id: customer === 'walkin' ? null : customer,
        items: cart.map((c) => ({
          product_id: c.product.id,
          quantity: c.quantity,
          unit_price: c.product.price,
        })),
        discount: discountAmount,
        delivery_fee: 0,
        payment_method: selectedPayment,
      },
      { onSuccess: onDone },
    );
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4 p-4">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map(product => (
              <Card
                key={product.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  product.stock < 10 && "border-orange-300",
                  product.stock === 0 && "opacity-50 pointer-events-none"
                )}
                onClick={() => product.stock > 0 && addToCart(product)}
              >
                <CardContent className="p-3">
                  <div className="text-3xl text-center mb-2 h-12 flex items-center justify-center overflow-hidden rounded">
                    {product.image.startsWith('http') || product.image.startsWith('/') ? (
                      <img src={product.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      product.image
                    )}
                  </div>
                  <p className="font-medium text-sm text-foreground truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-foreground">Rs. {product.price}</span>
                    <Badge variant={product.stock < 10 ? 'destructive' : 'secondary'} className="text-[10px]">
                      {product.stock} left
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Panel */}
      <Card className="w-[380px] flex flex-col flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Current Sale</CardTitle>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Customer Search & Selection */}
          <div className="px-4 pb-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search customer by name/phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>
            <Select value={customer} onValueChange={setCustomer}>
              <SelectTrigger className="h-9">
                <User className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Walk-in Customer" />
              </SelectTrigger>
              <SelectContent>
                {filteredCustomers.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.phone ? ` (${c.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Cart Items */}
          <ScrollArea className="flex-1 px-4">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No items in cart</p>
                <p className="text-xs">Click on products to add</p>
              </div>
            ) : (
              <div className="py-3 space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                    <span className="text-2xl w-10 h-10 flex items-center justify-center shrink-0 overflow-hidden rounded">
                      {item.product.image.startsWith('http') || item.product.image.startsWith('/') ? (
                        <img src={item.product.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        item.product.image
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Rs. {item.product.price}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Discount */}
          {cart.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <Input placeholder="Coupon code" className="flex-1 h-8" />
                <Button size="sm" variant="outline">Apply</Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Discount %"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="flex-1 h-8"
                  min={0}
                  max={100}
                />
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">Rs. {subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({discount}%)</span>
                  <span>-Rs. {discountAmount.toFixed(2)}</span>
                </div>
              )}
              {isVendor ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (13%)</span>
                  <span className="text-foreground">Rs. {taxVendor.toFixed(2)}</span>
                </div>
              ) : null}
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">Rs. {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <div className="p-4">
            <Button 
              className="w-full h-12 text-base"
              disabled={cart.length === 0 || isCheckoutPending}
              onClick={() => setPaymentModal(true)}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {isCheckoutPending ? 'Posting...' : `Pay Rs. ${total.toFixed(2)}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Dialog open={paymentModal} onOpenChange={setPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'card', label: 'Card', icon: CreditCard },
              { id: 'esewa', label: 'eSewa', icon: Smartphone },
              { id: 'qr', label: 'QR Pay', icon: QrCode },
            ].map(method => (
              <Card
                key={method.id}
                className={cn(
                  "cursor-pointer transition-all",
                  selectedPayment === method.id && "border-primary ring-2 ring-primary/20"
                )}
                onClick={() => setSelectedPayment(method.id)}
              >
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <method.icon className="w-8 h-8" />
                  <span className="font-medium">{method.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Amount to Pay</p>
            <p className="text-2xl font-bold text-primary">Rs. {total.toFixed(2)}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentModal(false)}>Cancel</Button>
            <Button onClick={handlePayment} disabled={!selectedPayment}>
              Complete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
