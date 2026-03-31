import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, TrendingUp, Clock, X, Grid3X3, List } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { mapWebsiteProductToUi, websiteApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const RECENT_SEARCHES_KEY = 'khudrapasal_recent_searches';
const MAX_RECENT = 8;

function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function pushRecentSearch(term: string) {
  const t = term.trim();
  if (t.length < 2) return;
  const prev = readRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase());
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([t, ...prev].slice(0, MAX_RECENT)));
}

interface SearchDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const SearchDropdown = ({ isOpen, onClose, searchQuery, onSearchChange }: SearchDropdownProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [recentRev, setRecentRev] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchPlaceholders = [] } = useQuery({
    queryKey: ['website', 'search-placeholders'],
    queryFn: () => websiteApi.searchPlaceholders(),
    staleTime: 60_000,
    enabled: isOpen,
  });

  const recentSearches = useMemo(() => (isOpen ? readRecentSearches() : []), [isOpen, recentRev]);

  const { data: trendingResponse, isLoading: trendingLoading } = useQuery({
    queryKey: ['search-trending-products'],
    queryFn: () => websiteApi.products({ bestseller: true, page_size: 8 }),
    enabled: isOpen,
  });
  const { data: searchedResponse, isLoading: searchLoading } = useQuery({
    queryKey: ['search-products', searchQuery],
    queryFn: () => websiteApi.products({ search: searchQuery, page_size: 8 }),
    enabled: isOpen && searchQuery.length > 0,
  });

  const trendingProducts = (trendingResponse?.results || []).map(mapWebsiteProductToUi).slice(0, 6);
  const filteredProducts = (searchedResponse?.results || []).map(mapWebsiteProductToUi).slice(0, 8);

  const pickSuggestion = (term: string) => {
    pushRecentSearch(term);
    onSearchChange(term);
    setRecentRev((r) => r + 1);
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-border shadow-sm">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search products, categories..."
              className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')} className="p-1 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 mb-4">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-lg transition-colors',
              viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-160px)] overflow-y-auto">
          {searchQuery.length === 0 ? (
            <>
              {recentSearches.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => pickSuggestion(term)}
                        className="px-3 py-1.5 bg-muted rounded-full text-sm text-foreground hover:bg-muted/80 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchPlaceholders.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Suggested searches
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {searchPlaceholders.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => pickSuggestion(term)}
                        className="px-3 py-1.5 bg-category-fresh/10 text-category-fresh rounded-full text-sm font-medium hover:bg-category-fresh/20 transition-colors"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Popular products</h3>
                {trendingLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-card rounded-xl border border-border h-48 animate-pulse" />
                    ))}
                  </div>
                ) : trendingProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No featured products yet.</p>
                ) : (
                  <div
                    className={cn(
                      viewMode === 'grid'
                        ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3'
                        : 'space-y-2',
                    )}
                  >
                    {trendingProducts.map((product) => (
                      <Link
                        key={product.id}
                        to={`/product/${product.slug}`}
                        onClick={onClose}
                        className={cn(
                          'block bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow',
                          viewMode === 'list' && 'flex items-center gap-3 p-3',
                        )}
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className={cn(
                            'object-cover',
                            viewMode === 'grid' ? 'w-full aspect-square' : 'w-16 h-16 rounded-lg',
                          )}
                        />
                        <div className={viewMode === 'grid' ? 'p-3' : 'flex-1'}>
                          <p className="text-sm font-medium text-foreground line-clamp-2">{product.name}</p>
                          <p className="text-sm font-bold text-category-fresh">Rs. {product.price.toLocaleString()}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              {searchLoading ? (
                <p className="text-sm text-muted-foreground mb-4">Searching…</p>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">
                  {filteredProducts.length} results for &quot;{searchQuery}&quot;
                </p>
              )}
              <div
                className={cn(
                  viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-2',
                )}
              >
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.slug}`}
                    onClick={onClose}
                    className={cn(
                      'block bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow',
                      viewMode === 'list' && 'flex items-center gap-3 p-3',
                    )}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className={cn(
                        'object-cover',
                        viewMode === 'grid' ? 'w-full aspect-square' : 'w-16 h-16 rounded-lg',
                      )}
                    />
                    <div className={viewMode === 'grid' ? 'p-3' : 'flex-1'}>
                      <p className="text-sm font-medium text-foreground line-clamp-2">{product.name}</p>
                      <p className="text-sm font-bold text-category-fresh">Rs. {product.price.toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchDropdown;
