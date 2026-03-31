import { useState } from 'react';
import { Plus, Check, Gift } from 'lucide-react';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';

interface FrequentlyBoughtTogetherProps {
  mainProduct: Product;
  relatedProducts: Product[];
  freeItem?: Product;
  mainQuantity?: number;
  onRequireAuth?: () => boolean;
}

const FrequentlyBoughtTogether = ({
  mainProduct,
  relatedProducts,
  freeItem,
  mainQuantity = 1,
  onRequireAuth,
}: FrequentlyBoughtTogetherProps) => {
  const { addToCart } = useCart();
  const [selectedItems, setSelectedItems] = useState<string[]>([mainProduct.id]);

  const toggleItem = (productId: string) => {
    if (productId === mainProduct.id) return; // Can't deselect main product
    setSelectedItems(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const allProducts = [mainProduct, ...relatedProducts];
  const selectedProducts = allProducts.filter(p => selectedItems.includes(p.id));
  const normalizedMainQty = Math.max(1, mainQuantity);
  const totalPrice = selectedProducts.reduce((sum, p) => {
    const itemQty = p.id === mainProduct.id ? normalizedMainQty : 1;
    return sum + p.price * itemQty;
  }, 0);

  const handleAddAll = () => {
    if (onRequireAuth && !onRequireAuth()) return;
    selectedProducts.forEach((product) => {
      const itemQty = product.id === mainProduct.id ? normalizedMainQty : 1;
      addToCart(product, itemQty);
    });
    if (freeItem) {
      // Add free item with price 0
      addToCart({ ...freeItem, price: 0, originalPrice: freeItem.price });
    }
  };

  return (
    <section className="bg-card rounded-2xl border border-border p-4 md:p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">Frequently Bought Together</h3>

      <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {allProducts.map((product, index) => {
          const isSelected = selectedItems.includes(product.id);
          const isMain = product.id === mainProduct.id;

          return (
            <div key={product.id} className="flex items-center gap-2 md:gap-4">
              {index > 0 && (
                <Plus className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
              <button
                onClick={() => toggleItem(product.id)}
                disabled={isMain}
                className={cn(
                  "relative flex-shrink-0 w-24 md:w-28 rounded-xl overflow-hidden border-2 transition-all",
                  isSelected ? "border-primary" : "border-border opacity-50",
                  isMain && "cursor-default"
                )}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-20 md:h-24 object-cover"
                />
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="p-1.5 bg-card">
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{product.name}</p>
                  <p className="text-xs font-bold text-foreground">
                    Rs. {product.price.toLocaleString()}
                    {product.id === mainProduct.id && normalizedMainQty > 1 ? ` x ${normalizedMainQty}` : ''}
                  </p>
                </div>
              </button>
            </div>
          );
        })}

        {/* Free Item */}
        {freeItem && (
          <>
            <span className="text-lg font-bold text-category-fresh flex-shrink-0">=</span>
            <div className="relative flex-shrink-0 w-24 md:w-28 rounded-xl overflow-hidden border-2 border-category-fresh">
              <div className="absolute top-1 left-1 z-10 px-2 py-0.5 bg-category-fresh text-white text-[10px] font-bold rounded">
                FREE
              </div>
              <img
                src={freeItem.image}
                alt={freeItem.name}
                className="w-full h-20 md:h-24 object-cover"
              />
              <div className="p-1.5 bg-category-fresh/10">
                <p className="text-[10px] text-muted-foreground line-clamp-1">{freeItem.name}</p>
                <p className="text-xs font-bold text-category-fresh">
                  <span className="line-through text-muted-foreground mr-1">Rs. {freeItem.price}</span>
                  FREE
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Total and Add Button */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div>
          <p className="text-sm text-muted-foreground">Total for {selectedProducts.length} items:</p>
          <p className="text-xl font-bold text-foreground">
            Rs. {totalPrice.toLocaleString()}
            {freeItem && (
              <span className="text-sm font-normal text-category-fresh ml-2">+ FREE {freeItem.name}</span>
            )}
          </p>
        </div>
        <button
          onClick={handleAddAll}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          Add All to Cart
        </button>
      </div>
    </section>
  );
};

export default FrequentlyBoughtTogether;
