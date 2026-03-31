import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveThemeClass } from '@/lib/categoryTheme';

interface BannerSlide {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  ctaText?: string;
  ctaAction?: () => void;
}

interface BannerSliderProps {
  slides: BannerSlide[];
  categoryTheme?: string;
  autoplay?: boolean;
  interval?: number;
  showButtons?: boolean;
  className?: string;
}

const BannerSlider = ({
  slides,
  categoryTheme = 'all',
  autoplay = true,
  interval = 4000,
  showButtons = true,
  className
}: BannerSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, interval);

    return () => clearInterval(timer);
  }, [autoplay, interval, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  if (slides.length === 0) return null;
  const theme = resolveThemeClass(categoryTheme);

  return (
    <div className={cn(`relative rounded-2xl overflow-hidden theme-${theme}`, className)}>
      {/* Slides */}
      <div className="relative h-40 md:h-56 lg:h-72">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-all duration-500 ease-in-out",
              index === currentIndex ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
            )}
          >
            <div className="relative h-full bg-theme-gradient">
              {slide.image && (
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
              <div className="relative z-10 h-full flex flex-col justify-center p-6 md:p-10">
                <h3 className="text-xl md:text-3xl lg:text-4xl font-bold text-white mb-2">
                  {slide.title}
                </h3>
                {slide.subtitle && (
                  <p className="text-white/80 text-sm md:text-lg mb-4 max-w-md">
                    {slide.subtitle}
                  </p>
                )}
                {slide.ctaText && (
                  <button
                    onClick={slide.ctaAction}
                    className="w-fit px-6 py-2.5 bg-white text-foreground rounded-full font-semibold text-sm hover:bg-white/90 transition-colors"
                  >
                    {slide.ctaText}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Action Buttons */}
      {showButtons && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
          <button className="px-4 py-2 bg-white text-foreground rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-shadow">
            Order Now
          </button>
          <button className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-semibold border border-white/30 hover:bg-white/30 transition-colors">
            Buy Again
          </button>
        </div>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex ? "bg-white w-6" : "bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;
