import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { websiteApi } from '@/lib/api';
import { cn } from '@/lib/utils';

type BannerRow = {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  click_url: string;
  category_slug: string | null;
  gradient?: string;
  cta_text?: string;
};

interface HeroBannerProps {
  /** When set, only banners whose `category_slug` matches are shown (placement must be `category`). */
  categoryFilter?: string;
  /** `homepage` — main carousel; `category` — category-page banners from admin. */
  placement: 'homepage' | 'category';
}

/** Pink → soft orange (reference image 1) when no admin gradient / hex tint. */
const DEFAULT_OVERLAY =
  'bg-gradient-to-r from-[hsl(340_82%_52%_/0.88)] via-[hsl(340_82%_52%_/0.35)] to-[hsl(36_100%_72%_/0.45)] dark:from-[hsl(340_75%_45%_/0.85)] dark:via-[hsl(340_75%_45%_/0.3)] dark:to-[hsl(36_90%_40%_/0.35)]';

function isInternalAppPath(href: string): boolean {
  const h = href.trim();
  return h.startsWith('/') && !h.startsWith('//');
}

/** Admin stores banner `gradient` as a hex color; a solid overlay would hide the hero image. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace('#', '').trim();
  if (h.length !== 3 && h.length !== 6) return null;
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b } : null;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) ? { r, g, b } : null;
}

function bannerTintFromHex(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  const { r, g, b } = rgb;
  return `linear-gradient(90deg, rgba(${r},${g},${b},0.82) 0%, rgba(${r},${g},${b},0.38) 40%, rgba(${r},${g},${b},0.1) 58%, transparent 75%)`;
}

/**
 * Use same origin + path for /media/ so Vite dev proxy serves files when API returns 127.0.0.1:8000 URLs.
 */
function resolveBannerImageUrl(url: string): string {
  if (!url?.trim()) return url;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) {
    try {
      const parsed = new URL(u);
      const local = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
      if (typeof window !== 'undefined' && local && parsed.pathname.startsWith('/media/')) {
        return `${window.location.origin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return u;
    }
    return u;
  }
  if (u.startsWith('/') && typeof window !== 'undefined') {
    return `${window.location.origin}${u}`;
  }
  return u;
}

const HeroBanner = ({ categoryFilter, placement }: HeroBannerProps) => {
  const [current, setCurrent] = useState(0);

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['website', 'banners', placement],
    queryFn: () => websiteApi.banners(placement),
    staleTime: 60_000,
  });

  const slides = useMemo(() => {
    const rows = (raw as BannerRow[]).filter((b) => b.image_url);
    if (placement === 'category' && categoryFilter && categoryFilter !== 'all') {
      return rows.filter((b) => b.category_slug === categoryFilter);
    }
    return rows;
  }, [raw, placement, categoryFilter]);

  useEffect(() => {
    setCurrent(0);
  }, [slides.length, placement, categoryFilter]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl min-h-[240px] md:min-h-[340px] lg:min-h-[380px] bg-muted animate-pulse" />
    );
  }

  if (!slides.length) {
    return null;
  }

  const slide = slides[current];
  const href = slide.click_url?.trim();
  const customGradient = slide.gradient?.trim();
  const hexTint = customGradient && hexToRgb(customGradient) ? customGradient : '';
  const ctaLabel = slide.cta_text?.trim() || 'Shop now';
  const imageSrc = resolveBannerImageUrl(slide.image_url);

  const ctaClassName =
    'inline-block px-7 py-3 rounded-full font-semibold text-sm md:text-base bg-white text-gray-900 shadow-md transition-opacity hover:opacity-90';

  const ctaEl =
    href &&
    (isInternalAppPath(href) ? (
      <Link to={href} className={ctaClassName}>
        {ctaLabel}
      </Link>
    ) : (
      <a href={href} className={ctaClassName}>
        {ctaLabel}
      </a>
    ));

  const inner = (
    <>
      <img
        src={imageSrc}
        alt={slide.title}
        className="absolute inset-0 z-0 w-full h-full object-cover object-center md:object-right"
      />
      {hexTint ? (
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: bannerTintFromHex(hexTint) }}
          aria-hidden
        />
      ) : customGradient ? (
        <div
          className="absolute inset-0 z-[1] pointer-events-none opacity-45"
          style={{ background: customGradient }}
          aria-hidden
        />
      ) : (
        <div className={cn('absolute inset-0 z-[1] pointer-events-none', DEFAULT_OVERLAY)} aria-hidden />
      )}
      <div className="relative z-[2] grid min-h-[240px] grid-cols-1 md:min-h-[340px] md:grid-cols-2 lg:min-h-[380px]">
        <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
          <div className="max-w-[min(100%,28rem)]">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-2 font-heading drop-shadow-sm">
              {slide.title}
            </h2>
            {slide.subtitle ? (
              <p className="text-white/95 text-sm md:text-lg mb-5 drop-shadow-sm">{slide.subtitle}</p>
            ) : null}
            {ctaEl}
          </div>
        </div>
        <div className="hidden md:block" aria-hidden />
      </div>
      {slides.length > 1 && (
        <>
          <div
            className="absolute bottom-20 left-1/2 z-[3] flex -translate-x-1/2 gap-2 md:bottom-24"
            role="tablist"
            aria-label="Banner slides"
          >
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors md:h-2.5 md:w-2.5 ring-1 ring-white/60 shadow-sm',
                  i === current ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/70',
                )}
                aria-label={`Slide ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setCurrent((p) => (p - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 z-[3] -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((p) => (p + 1) % slides.length)}
            className="absolute right-2 top-1/2 z-[3] -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </>
  );

  return <div className="hero-banner relative overflow-hidden rounded-2xl">{inner}</div>;
};

export default HeroBanner;
