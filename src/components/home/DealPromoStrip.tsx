import { Link } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WebsiteDealSummary = { id: number; name: string; discount_percent: string };

interface DealPromoStripProps {
  deals: WebsiteDealSummary[];
  max?: number;
}

const TILE_STYLES = [
  'from-amber-100 to-yellow-50 border-amber-200/70 text-amber-950 dark:from-amber-950/50 dark:to-yellow-950/30 dark:border-amber-800/50 dark:text-amber-50',
  'from-emerald-100 to-teal-50 border-emerald-200/70 text-emerald-950 dark:from-emerald-950/50 dark:to-teal-950/30 dark:border-emerald-800/50 dark:text-emerald-50',
  'from-sky-100 to-blue-50 border-sky-200/70 text-sky-950 dark:from-sky-950/50 dark:to-blue-950/30 dark:border-sky-800/50 dark:text-sky-50',
  'from-violet-100 to-purple-50 border-violet-200/70 text-violet-950 dark:from-violet-950/50 dark:to-purple-950/30 dark:border-violet-800/50 dark:text-violet-50',
];

/**
 * Pastel promo tiles from active flash deals (GET /website/deals/). Renders nothing when empty.
 */
const DealPromoStrip = ({ deals, max = 4 }: DealPromoStripProps) => {
  const rows = deals.slice(0, max);
  if (!rows.length) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
      {rows.map((deal, i) => {
        const pct = String(deal.discount_percent ?? '').trim();
        return (
          <Link
            key={deal.id}
            to="/products/flash-deals"
            className={cn(
              'relative rounded-2xl overflow-hidden border bg-gradient-to-br p-4 flex flex-col justify-between min-h-[120px] md:min-h-[140px] hover:shadow-md transition-shadow',
              TILE_STYLES[i % TILE_STYLES.length],
            )}
          >
            <div className="flex items-start gap-2">
              <Tag className="w-5 h-5 opacity-80 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm md:text-base leading-tight line-clamp-2">{deal.name}</h3>
                {pct ? (
                  <span className="inline-block mt-2 text-[10px] md:text-xs font-bold px-2 py-0.5 rounded bg-white/60 dark:bg-black/25">
                    Up to {pct}% off
                  </span>
                ) : null}
              </div>
            </div>
            <span className="text-xs font-semibold mt-2 opacity-90">View deals →</span>
          </Link>
        );
      })}
    </div>
  );
};

export default DealPromoStrip;
