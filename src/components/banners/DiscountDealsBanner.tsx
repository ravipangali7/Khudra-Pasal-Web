import { Link } from 'react-router-dom';
import { Tag, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const CORAL = '#f06565';

interface DiscountDealsBannerProps {
  dealCount: number;
  /** When set, the whole banner is clickable and shows the CTA chip. */
  to?: string;
  /** On the deals listing page: hide the white CTA. */
  hideCta?: boolean;
  className?: string;
}

function BannerInner({
  dealCount,
  hideCta,
}: Pick<DiscountDealsBannerProps, 'dealCount' | 'hideCta'>) {
  const subtitle =
    dealCount <= 0
      ? 'Browse all limited-time offers'
      : `${dealCount}+ deals available`;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 rounded-3xl px-5 py-4 md:px-8 md:py-5 shadow-md',
      )}
      style={{ backgroundColor: CORAL }}
    >
      <div className="flex min-w-0 items-center gap-4 md:gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center md:h-14 md:w-14" aria-hidden>
          <Tag
            className="h-10 w-10 -rotate-12 text-yellow-300 drop-shadow-sm md:h-12 md:w-12"
            strokeWidth={2.35}
            fill="rgba(250, 204, 21, 0.35)"
          />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white md:text-xl">Discounted Products</h2>
          <p className="mt-0.5 text-sm font-normal text-white/95 md:text-[15px]">{subtitle}</p>
        </div>
      </div>

      {!hideCta && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-white px-5 py-2.5 text-sm font-bold shadow-sm md:px-6 md:py-3"
          style={{ color: CORAL }}
        >
          View All Deals
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}

/**
 * Coral promo banner (home / section header) matching storefront discount deals design.
 */
const DiscountDealsBanner = ({ dealCount, to, hideCta = false, className }: DiscountDealsBannerProps) => {
  const inner = <BannerInner dealCount={dealCount} hideCta={hideCta} />;

  if (to && !hideCta) {
    return (
      <Link
        to={to}
        className={cn('block transition-opacity hover:opacity-[0.97] active:opacity-95', className)}
      >
        {inner}
      </Link>
    );
  }

  return <div className={className}>{inner}</div>;
};

export default DiscountDealsBanner;
