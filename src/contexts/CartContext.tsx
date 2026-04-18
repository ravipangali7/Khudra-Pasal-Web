import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, CartItem } from '@/types';
import {
  isStorefrontCustomerSession,
  mapWebsiteCartToCartItems,
  websiteApi,
  type WebsiteCartApi,
} from '@/lib/api';
import { useChildShoppingRules } from '@/contexts/ChildShoppingRulesContext';
import { evaluateChildProductCommerce } from '@/lib/childShoppingRules';
import { savePendingCartIntent } from '@/lib/pendingCartIntent';
import { toast } from 'sonner';

const LISTING_KEY_SEP = '::';

function makeListingCartKey(listingScope: string, productId: string) {
  return `${listingScope}${LISTING_KEY_SEP}${productId}`;
}

function productIdFromListingCartKey(key: string): string {
  const i = key.lastIndexOf(LISTING_KEY_SEP);
  return i >= 0 ? key.slice(i + LISTING_KEY_SEP.length) : key;
}

function filterListingKeysForCart(
  prev: Set<string>,
  productIdsInCart: Set<string>,
): Set<string> {
  const next = new Set<string>();
  for (const k of prev) {
    if (productIdsInCart.has(productIdFromListingCartKey(k))) next.add(k);
  }
  return next;
}

function removeListingKeysForProduct(prev: Set<string>, productId: string): Set<string> {
  const suffix = `${LISTING_KEY_SEP}${productId}`;
  const next = new Set<string>();
  for (const k of prev) {
    if (!k.endsWith(suffix)) next.add(k);
  }
  return next;
}

export type AddToCartOptions = { listingScope?: string };

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number, options?: AddToCartOptions) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  getItemQuantity: (productId: string) => number;
  isListingCartActive: (listingScope: string, productId: string) => boolean;
  clearCart: () => void;
  /** Re-fetch server cart into context (e.g. after checkout quote says a product is unavailable). */
  refreshServerCart: () => Promise<void>;
  cartCount: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  lastAddedProduct: Product | null;
  cartSyncing: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CHILD_RULES_LOADING_MSG = 'Checking your family shopping rules…';
const CHILD_RULES_ERROR_MSG = 'Could not load family shopping rules. Try again.';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const {
    isChildShopper,
    rules,
    isLoadingProfile,
    isLoadingRules,
    rulesFetchError,
  } = useChildShoppingRules();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAddedProduct, setLastAddedProduct] = useState<Product | null>(null);
  const [cartSyncing, setCartSyncing] = useState(false);
  const [listingCartActiveKeys, setListingCartActiveKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const cartItemsRef = useRef<CartItem[]>([]);
  cartItemsRef.current = cartItems;
  const listingCartActiveKeysRef = useRef<Set<string>>(listingCartActiveKeys);
  listingCartActiveKeysRef.current = listingCartActiveKeys;

  const applyServerCart = useCallback((cart: WebsiteCartApi) => {
    const items = mapWebsiteCartToCartItems(cart);
    const ids = new Set(items.map((i) => i.product.id));
    setCartItems(items);
    setListingCartActiveKeys((prev) => filterListingKeysForCart(prev, ids));
  }, []);

  const refreshServerCart = useCallback(async () => {
    if (!isStorefrontCustomerSession()) return;
    try {
      const cart = await websiteApi.cart();
      applyServerCart(cart);
    } catch {
      /* ignore */
    }
  }, [applyServerCart]);

  useEffect(() => {
    if (!isStorefrontCustomerSession()) {
      setCartItems([]);
      setListingCartActiveKeys(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      setCartSyncing(true);
      try {
        const cart = await websiteApi.cart();
        if (!cancelled) applyServerCart(cart);
      } catch {
        /* guest or API error */
      } finally {
        if (!cancelled) setCartSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyServerCart]);

  useEffect(() => {
    const onAuthChanged = () => {
      if (!isStorefrontCustomerSession()) {
        setCartItems([]);
        setListingCartActiveKeys(new Set());
        return;
      }
      void refreshServerCart();
    };
    window.addEventListener('khudra-auth-changed', onAuthChanged);
    return () => window.removeEventListener('khudra-auth-changed', onAuthChanged);
  }, [refreshServerCart]);

  const addToCart = useCallback(
    (product: Product, quantity = 1, options?: AddToCartOptions) => {
      if (!isStorefrontCustomerSession()) {
        const nextPath = `${window.location.pathname}${window.location.search}`;
        savePendingCartIntent({
          product,
          quantity,
          listingScope: options?.listingScope,
          nextPath,
        });
        navigate(`/login?next=${encodeURIComponent(nextPath)}&shop=1`);
        return;
      }
      if (isChildShopper) {
        if (isLoadingProfile || isLoadingRules) {
          toast.message(CHILD_RULES_LOADING_MSG);
          return;
        }
        if (rulesFetchError || !rules) {
          toast.error(CHILD_RULES_ERROR_MSG);
          return;
        }
        const ev = evaluateChildProductCommerce(product, rules);
        if (ev.commerceDisabled) {
          if (ev.needsApproval && !ev.hasPurchaseApproval) {
            toast.message(
              'This item needs parent approval. Use “Ask parent” on the product card or request approval on the product page.',
            );
            return;
          }
          toast.error(ev.message);
          return;
        }
      }
      const rollback = cartItemsRef.current;
      const listingScope = options?.listingScope;
      const listingKey =
        listingScope != null && listingScope !== ''
          ? makeListingCartKey(listingScope, product.id)
          : null;

      setLastAddedProduct(product);
      setCartItems((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
        }
        return [...prev, { product, quantity }];
      });
      if (listingKey) {
        setListingCartActiveKeys((prev) => new Set(prev).add(listingKey));
      }
      setIsCartOpen(true);
      window.setTimeout(() => setIsCartOpen(false), 3000);

      void (async () => {
        setCartSyncing(true);
        try {
          const cart = await websiteApi.addToCart(Number(product.id), quantity);
          applyServerCart(cart);
        } catch (e) {
          setCartItems(rollback);
          if (listingKey) {
            setListingCartActiveKeys((prev) => {
              const next = new Set(prev);
              next.delete(listingKey);
              return next;
            });
          }
          toast.error(e instanceof Error ? e.message : 'Could not add to cart');
        } finally {
          setCartSyncing(false);
        }
      })();
    },
    [
      applyServerCart,
      navigate,
      isChildShopper,
      rules,
      isLoadingProfile,
      isLoadingRules,
      rulesFetchError,
    ],
  );

  const removeFromCart = useCallback(
    (productId: string) => {
      const target = cartItemsRef.current.find((i) => i.product.id === productId);
      const snapshot = cartItemsRef.current;
      const listingSnapshot = new Set(listingCartActiveKeysRef.current);
      setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
      setListingCartActiveKeys((prev) => removeListingKeysForProduct(prev, productId));

      if (!isStorefrontCustomerSession() || !target?.cartItemId) return;

      void (async () => {
        setCartSyncing(true);
        try {
          await websiteApi.removeCartItem(target.cartItemId!);
          await refreshServerCart();
        } catch (e) {
          setCartItems(snapshot);
          setListingCartActiveKeys(listingSnapshot);
          toast.error(e instanceof Error ? e.message : 'Could not remove item');
        } finally {
          setCartSyncing(false);
        }
      })();
    },
    [refreshServerCart],
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }

      const prevItem = cartItemsRef.current.find((i) => i.product.id === productId);
      if (prevItem && quantity > prevItem.quantity && isChildShopper) {
        if (isLoadingProfile || isLoadingRules) {
          toast.message(CHILD_RULES_LOADING_MSG);
          return;
        }
        if (rulesFetchError || !rules) {
          toast.error(CHILD_RULES_ERROR_MSG);
          return;
        }
        const ev = evaluateChildProductCommerce(prevItem.product, rules);
        if (ev.commerceDisabled) {
          toast.error(ev.message);
          return;
        }
      }
      const snapshot = cartItemsRef.current;

      setCartItems((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item,
        ),
      );

      if (!isStorefrontCustomerSession() || !prevItem?.cartItemId) return;

      void (async () => {
        setCartSyncing(true);
        try {
          await websiteApi.updateCartItem(prevItem.cartItemId!, quantity);
          await refreshServerCart();
        } catch (e) {
          setCartItems(snapshot);
          toast.error(e instanceof Error ? e.message : 'Could not update cart');
        } finally {
          setCartSyncing(false);
        }
      })();
    },
    [
      removeFromCart,
      refreshServerCart,
      isChildShopper,
      rules,
      isLoadingProfile,
      isLoadingRules,
      rulesFetchError,
    ],
  );

  const getItemQuantity = useCallback((productId: string) => {
    const item = cartItems.find((item) => item.product.id === productId);
    return item?.quantity || 0;
  }, [cartItems]);

  const isListingCartActive = useCallback(
    (listingScope: string, productId: string) =>
      listingCartActiveKeys.has(makeListingCartKey(listingScope, productId)),
    [listingCartActiveKeys],
  );

  const clearCart = useCallback(() => {
    const snapshot = cartItemsRef.current;
    const listingSnapshot = new Set(listingCartActiveKeysRef.current);
    setCartItems([]);
    setListingCartActiveKeys(new Set());

    if (!isStorefrontCustomerSession()) return;

    void (async () => {
      setCartSyncing(true);
      try {
        const cart = await websiteApi.cart();
        const items = mapWebsiteCartToCartItems(cart);
        for (const it of items) {
          if (it.cartItemId) {
            await websiteApi.removeCartItem(it.cartItemId);
          }
        }
      } catch (e) {
        setCartItems(snapshot);
        setListingCartActiveKeys(listingSnapshot);
        toast.error(e instanceof Error ? e.message : 'Could not clear cart');
      } finally {
        setCartSyncing(false);
      }
    })();
  }, []);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        getItemQuantity,
        isListingCartActive,
        clearCart,
        refreshServerCart,
        cartCount,
        cartTotal,
        isCartOpen,
        setIsCartOpen,
        lastAddedProduct,
        cartSyncing,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
