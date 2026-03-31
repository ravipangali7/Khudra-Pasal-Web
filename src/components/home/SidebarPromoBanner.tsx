import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { websiteApi } from '@/lib/api';

type BannerRow = {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  click_url: string;
  gradient?: string;
};

/**
 * Mid-page promos: configure banners in admin with placement **Sidebar**.
 * Renders nothing when no active sidebar banners.
 */
const SidebarPromoBanner = () => {
  const [current, setCurrent] = useState(0);

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['website', 'banners', 'sidebar'],
    queryFn: () => websiteApi.banners('sidebar'),
    staleTime: 60_000,
  });

  const slides = useMemo(() => (raw as BannerRow[]).filter((b) => b.image_url), [raw]);

  useEffect(() => {
    setCurrent(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (isLoading || !slides.length) return null;

  const slide = slides[current];
  const href = slide.click_url?.trim();
  const body = (
    <div className="relative overflow-hidden rounded-2xl min-h-[140px] md:min-h-[180px] bg-muted">
      <img src={slide.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
      <div className="relative z-10 flex flex-col justify-center p-6 md:p-8 min-h-[140px] md:min-h-[180px] max-w-lg">
        <h3 className="text-xl md:text-2xl font-bold text-white font-heading">{slide.title}</h3>
        {slide.subtitle ? <p className="text-sm md:text-base text-white/90 mt-1">{slide.subtitle}</p> : null}
      </div>
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setCurrent((p) => (p - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/35 text-white hidden md:flex items-center justify-center"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((p) => (p + 1) % slides.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/35 text-white hidden md:flex items-center justify-center"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );

  if (href) {
    return (
      <section aria-label="Promotional banner">
        <a href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {body}
        </a>
      </section>
    );
  }

  return <section aria-label="Promotional banner">{body}</section>;
};

export default SidebarPromoBanner;
