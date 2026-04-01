import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Clock } from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import { Product } from '@/types';
import { resolveThemeClass } from '@/lib/categoryTheme';

interface FlashDealsProps {
  products: Product[];
  categoryTheme?: string;
  listingScope?: string;
  /** ISO end time from flash deal API; when missing, shows a static label instead of a ticking timer. */
  endsAt?: string | null;
}

function parseDeadline(iso: string | null | undefined): Date | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const FlashDeals = ({ products, categoryTheme = 'cafe', listingScope, endsAt }: FlashDealsProps) => {
  const deadline = useMemo(() => parseDeadline(endsAt), [endsAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeLeft = useMemo(() => {
    if (!deadline) return null;
    const ms = deadline.getTime() - now;
    if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true as const };
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return { hours, minutes, seconds, expired: false as const };
  }, [deadline, now]);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');
  const theme = resolveThemeClass(categoryTheme);

  if (!products.length) return null;

  return (
    <section className={`theme-${theme}`}>
      <div className="rounded-2xl overflow-hidden border border-storefront-orange/25 shadow-card">
        <div className="bg-gradient-to-r from-storefront-orange via-amber-500 to-storefront-orange-deep text-white px-4 py-3 md:px-5 md:py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base md:text-lg font-bold truncate">Flash Sale</h2>
              <p className="text-xs text-white/85 truncate">Limited-time prices</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {timeLeft && !timeLeft.expired ? (
              <div className="flex items-center gap-2 bg-black/15 px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4 text-white" />
                <div className="flex items-center gap-1 font-mono font-bold text-white text-sm">
                  <span className="bg-white/20 px-1.5 py-0.5 rounded">{formatNumber(timeLeft.hours)}</span>
                  <span>:</span>
                  <span className="bg-white/20 px-1.5 py-0.5 rounded">{formatNumber(timeLeft.minutes)}</span>
                  <span>:</span>
                  <span className="bg-white/20 px-1.5 py-0.5 rounded">{formatNumber(timeLeft.seconds)}</span>
                </div>
              </div>
            ) : (
              <span className="text-xs md:text-sm font-semibold text-white/90">Limited time</span>
            )}
            <Link
              to="/products/flash-deals"
              className="text-xs md:text-sm font-bold bg-white text-storefront-orange-deep px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors whitespace-nowrap shadow-sm"
            >
              View all deals
            </Link>
          </div>
        </div>

        <div className="bg-card p-3 md:p-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:pb-0 md:grid-cols-4 lg:grid-cols-6">
            {products.map((product) => (
              <div key={product.id} className="shrink-0 basis-full snap-start sm:basis-auto sm:shrink">
                <ProductCard
                  product={product}
                  categoryTheme={categoryTheme}
                  listingScope={listingScope}
                  topRightAccent="hot"
                  sectionFrame="flash"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlashDeals;
