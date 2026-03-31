import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websiteApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const VALID_VARIANTS = ['teal_button', 'white_discount', 'white_link', 'magenta_button'] as const;
type CardVariant = (typeof VALID_VARIANTS)[number];

export type PromoStripBannerRow = {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  click_url: string;
  card_variant: string;
  cta_text: string;
  badge_text: string;
  sort_order: number;
};

function isInternalAppPath(href: string): boolean {
  const h = href.trim();
  return h.startsWith('/') && !h.startsWith('//');
}

function PromoNavLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const h = href.trim();
  if (!h) {
    return <span className={className}>{children}</span>;
  }
  if (isInternalAppPath(h)) {
    return (
      <Link to={h} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={h} className={className}>
      {children}
    </a>
  );
}

function DecorativeBlob({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full opacity-30 md:h-32 md:w-32',
        className,
      )}
      aria-hidden
    />
  );
}

const HomePromoStrip = () => {
  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['website', 'banners', 'promo_strip'],
    queryFn: () => websiteApi.banners('promo_strip'),
    staleTime: 60_000,
  });

  const rows = (raw as PromoStripBannerRow[])
    .filter((b) => VALID_VARIANTS.includes(b.card_variant as CardVariant))
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-h-[120px] rounded-2xl border bg-muted animate-pulse md:min-h-[140px]" />
        ))}
      </div>
    );
  }

  if (!rows.length) return null;

  return (
    <section aria-label="Promotions" className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
      {rows.map((row) => {
        const href = row.click_url?.trim() ?? '';
        const variant = row.card_variant as CardVariant;

        if (variant === 'teal_button') {
          const cta = row.cta_text?.trim() || 'Order now';
          const inner = (
            <>
              <DecorativeBlob className="bg-emerald-200/50" />
              <div className="relative z-[1] flex min-h-[120px] flex-col justify-between md:min-h-[140px]">
                <div>
                  <h3 className="text-sm font-bold leading-tight text-white md:text-base">{row.title}</h3>
                  {row.subtitle ? (
                    <p className="mt-1 text-xs text-white/90 md:text-sm">{row.subtitle}</p>
                  ) : null}
                </div>
                {href ? (
                  <span className="mt-3 inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 md:text-sm">
                    {cta}
                  </span>
                ) : null}
              </div>
            </>
          );
          return href ? (
            <PromoNavLink
              key={row.id}
              href={href}
              className="relative block overflow-hidden rounded-2xl border border-teal-600/30 bg-gradient-to-br from-teal-500 to-cyan-600 p-4 text-left shadow-card transition-shadow hover:shadow-product"
            >
              {inner}
            </PromoNavLink>
          ) : (
            <div
              key={row.id}
              className="relative overflow-hidden rounded-2xl border border-teal-600/30 bg-gradient-to-br from-teal-500 to-cyan-600 p-4 shadow-card"
            >
              {inner}
            </div>
          );
        }

        if (variant === 'magenta_button') {
          const cta = row.cta_text?.trim() || 'Shop now';
          const inner = (
            <>
              <DecorativeBlob className="bg-pink-200/40" />
              <div className="relative z-[1] flex min-h-[120px] flex-col justify-between md:min-h-[140px]">
                <div>
                  <h3 className="text-sm font-bold leading-tight text-white md:text-base">{row.title}</h3>
                  {row.subtitle ? (
                    <p className="mt-1 text-xs text-white/90 md:text-sm">{row.subtitle}</p>
                  ) : null}
                </div>
                {href ? (
                  <span className="mt-3 inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 md:text-sm">
                    {cta}
                  </span>
                ) : null}
              </div>
            </>
          );
          return href ? (
            <PromoNavLink
              key={row.id}
              href={href}
              className="relative block overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary to-pink-600 p-4 text-left shadow-card transition-shadow hover:shadow-product"
            >
              {inner}
            </PromoNavLink>
          ) : (
            <div
              key={row.id}
              className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary to-pink-600 p-4 shadow-card"
            >
              {inner}
            </div>
          );
        }

        if (variant === 'white_discount') {
          const cta = row.cta_text?.trim() || 'Shop now';
          const cardBody = (
            <div className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-card md:min-h-[140px]">
              <div>
                <h3 className="text-sm font-bold text-foreground md:text-base">{row.title}</h3>
                {row.badge_text?.trim() ? (
                  <p className="mt-2 inline-block border border-foreground px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-foreground md:text-xs">
                    {row.badge_text.trim()}
                  </p>
                ) : null}
              </div>
              {href ? (
                <span className="mt-3 w-fit text-xs font-semibold text-foreground underline underline-offset-2 md:text-sm">
                  {cta}
                </span>
              ) : null}
            </div>
          );
          return href ? (
            <PromoNavLink
              key={row.id}
              href={href}
              className="block overflow-hidden rounded-2xl text-left transition-shadow hover:shadow-md"
            >
              {cardBody}
            </PromoNavLink>
          ) : (
            <div key={row.id} className="overflow-hidden rounded-2xl">
              {cardBody}
            </div>
          );
        }

        /* white_link */
        const cta = row.cta_text?.trim() || 'See All';
        const cardBody = (
          <div className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-card md:min-h-[140px]">
            <div>
              <h3 className="text-sm font-bold text-foreground md:text-base">{row.title}</h3>
              {row.subtitle ? (
                <p className="mt-1 text-xs text-muted-foreground md:text-sm">{row.subtitle}</p>
              ) : null}
            </div>
            {href ? (
              <span className="mt-3 w-fit text-xs font-semibold text-foreground underline underline-offset-2 md:text-sm">
                {cta}
              </span>
            ) : null}
          </div>
        );
        return href ? (
          <PromoNavLink
            key={row.id}
            href={href}
            className="block overflow-hidden rounded-2xl text-left transition-shadow hover:shadow-md"
          >
            {cardBody}
          </PromoNavLink>
        ) : (
          <div key={row.id} className="overflow-hidden rounded-2xl">
            {cardBody}
          </div>
        );
      })}
    </section>
  );
};

export default HomePromoStrip;
