import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveThemeClass } from '@/lib/categoryTheme';

interface Subcategory {
  id: string;
  name: string;
  icon?: string;
  image?: string;
}

interface SubcategorySliderProps {
  subcategories: Subcategory[];
  activeId?: string;
  onSelect?: (id: string) => void;
  categoryTheme?: string;
  variant?: 'pills' | 'cards' | 'images';
}

const SubcategorySlider = ({
  subcategories,
  activeId,
  onSelect,
  categoryTheme = 'all',
  variant = 'pills'
}: SubcategorySliderProps) => {
  const theme = resolveThemeClass(categoryTheme);
  return (
    <div className={`theme-${theme}`}>
      <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {subcategories.map((sub) => {
          const isActive = activeId === sub.id;

          if (variant === 'cards') {
            return (
              <button
                key={sub.id}
                onClick={() => onSelect?.(sub.id)}
                className={cn(
                  "flex-shrink-0 p-3 rounded-xl border transition-all min-w-[100px] text-center",
                  isActive
                    ? "bg-theme text-white border-theme shadow-lg"
                    : "bg-card border-border hover:border-theme/50"
                )}
              >
                {sub.icon && <span className="text-2xl mb-1 block">{sub.icon}</span>}
                <span className="text-xs font-medium">{sub.name}</span>
              </button>
            );
          }

          if (variant === 'images') {
            return (
              <button
                key={sub.id}
                onClick={() => onSelect?.(sub.id)}
                className={cn(
                  "flex-shrink-0 w-24 md:w-28 rounded-xl overflow-hidden transition-all",
                  isActive ? "ring-2 ring-theme ring-offset-2" : "hover:opacity-80"
                )}
              >
                {sub.image ? (
                  <img
                    src={sub.image}
                    alt={sub.name}
                    className="w-full h-16 md:h-20 object-cover"
                  />
                ) : (
                  <div className="w-full h-16 md:h-20 bg-muted flex items-center justify-center text-2xl">
                    {sub.icon}
                  </div>
                )}
                <p className="text-xs font-medium text-center py-1.5 bg-card">{sub.name}</p>
              </button>
            );
          }

          // Default: pills
          return (
            <button
              key={sub.id}
              onClick={() => onSelect?.(sub.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-theme text-white border-theme"
                  : "bg-card border-border hover:border-theme/50 text-foreground"
              )}
            >
              {sub.icon && <span>{sub.icon}</span>}
              {sub.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubcategorySlider;
