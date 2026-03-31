import { useState } from 'react';
import { X, Sparkles, Grid3X3, Shield, CreditCard, Smartphone, ChevronRight } from 'lucide-react';
import { Product } from '@/types';
import { cn } from '@/lib/utils';

interface AIInfoPopupProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export const AIInfoPopup = ({ product, isOpen, onClose }: AIInfoPopupProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-foreground">AI Product Info</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Product Type</h4>
            <p className="text-foreground">{product.categoryName || product.category}</p>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Item Form</h4>
            <p className="text-foreground">{product.unit || 'Standard'}</p>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Product Details</h4>
            <p className="text-foreground">
              {product.description?.trim()
                ? product.description
                : 'No additional description has been provided for this product.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SimilarItemsPopupProps {
  product: Product;
  similarProducts: Product[];
  isOpen: boolean;
  onClose: () => void;
}

export const SimilarItemsPopup = ({ product, similarProducts, isOpen, onClose }: SimilarItemsPopupProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-scale-in">
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Grid3X3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-bold text-foreground">Similar Items</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {similarProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No similar items in the catalog yet.</p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {similarProducts.map((item) => (
              <div key={item.id} className="bg-muted rounded-xl p-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
                <p className="text-xs font-medium text-foreground line-clamp-2">{item.name}</p>
                <p className="text-sm font-bold text-foreground mt-1">Rs. {item.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export interface OfferSlide {
  title: string;
  description: string;
  icon: 'credit' | 'phone' | 'shield';
  color: string;
}

export type WebsiteDealRow = { id: number; name: string; discount_percent: string };

const OFFER_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-green-500 to-green-600',
  'from-amber-500 to-amber-600',
] as const;
const OFFER_ICONS: Array<'credit' | 'phone' | 'shield'> = ['credit', 'phone', 'shield'];

export function mapWebsiteDealsToOfferSlides(deals: WebsiteDealRow[]): OfferSlide[] {
  return deals.map((deal, index) => {
    const pct = String(deal.discount_percent ?? '').trim();
    return {
      title: deal.name,
      description: pct ? `Up to ${pct}% off on eligible items` : 'Limited-time promotion',
      icon: OFFER_ICONS[index % OFFER_ICONS.length],
      color: OFFER_GRADIENTS[index % OFFER_GRADIENTS.length],
    };
  });
}

interface OffersSliderProps {
  offers: OfferSlide[];
}

export const OffersSlider = ({ offers }: OffersSliderProps) => {
  if (!offers.length) return null;
  const IconMap = { credit: CreditCard, phone: Smartphone, shield: Shield };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {offers.map((offer, index) => {
        const Icon = IconMap[offer.icon];
        return (
          <div
            key={`${offer.title}-${index}`}
            className={cn(
              "flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r text-white min-w-[250px]",
              offer.color
            )}
          >
            <Icon className="w-8 h-8 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">{offer.title}</p>
              <p className="text-xs text-white/80">{offer.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface WarrantyPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WarrantyPopup = ({ isOpen, onClose }: WarrantyPopupProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl max-w-md w-full animate-scale-in">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-category-fresh" />
            <h3 className="font-bold text-foreground">Warranty & Guarantee</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-category-fresh/10 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-category-fresh flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">7-Day Return Policy</h4>
              <p className="text-sm text-muted-foreground">Easy returns if product is damaged or defective</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">100% Authentic</h4>
              <p className="text-sm text-muted-foreground">All products are verified for authenticity</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-muted rounded-xl">
            <div className="w-10 h-10 rounded-full bg-muted-foreground flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Secure Payments</h4>
              <p className="text-sm text-muted-foreground">Multiple payment options available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface VariantSelectorProps {
  variants: { label: string; options: string[] }[];
  selected: Record<string, string>;
  onChange: (label: string, value: string) => void;
}

export const VariantSelector = ({ variants, selected, onChange }: VariantSelectorProps) => {
  return (
    <div className="space-y-4">
      {variants.map((variant) => (
        <div key={variant.label}>
          <h4 className="text-sm font-semibold text-foreground mb-2">{variant.label}</h4>
          <div className="flex flex-wrap gap-2">
            {variant.options.map((option) => (
              <button
                key={option}
                onClick={() => onChange(variant.label, option)}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  selected[variant.label] === option
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/50"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
