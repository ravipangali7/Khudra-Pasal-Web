import { useState } from 'react';
import { ChevronRight, X, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarCategory {
  id: string;
  name: string;
  icon?: string;
}

interface CategoryFloatingSidebarProps {
  categories: SidebarCategory[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

const CategoryFloatingSidebar = ({
  categories,
  activeId,
  onSelect
}: CategoryFloatingSidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-primary text-primary-foreground p-2 rounded-r-lg shadow-lg hover:bg-primary/90 transition-colors md:block hidden"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border shadow-xl z-50 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-foreground">Categories</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-2 space-y-1 max-h-[calc(100vh-80px)] overflow-y-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                onSelect?.(category.id);
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg transition-colors text-left",
                activeId === category.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                {category.icon && <span className="text-lg">{category.icon}</span>}
                <span className="font-medium text-sm">{category.name}</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default CategoryFloatingSidebar;
