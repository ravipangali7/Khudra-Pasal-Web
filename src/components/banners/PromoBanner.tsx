import { resolveThemeClass } from '@/lib/categoryTheme';

interface PromoBannerProps {
  title: string;
  subtitle?: string;
  discount?: string;
  category?: string;
  image?: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

const PromoBanner = ({ 
  title, 
  subtitle,
  discount,
  category = 'cafe',
  image,
  ctaText = 'Shop now',
  onCtaClick 
}: PromoBannerProps) => {
  const theme = resolveThemeClass(category);
  return (
    <div className={`theme-${theme} relative overflow-hidden rounded-xl bg-theme-gradient p-4 md:p-6 min-h-[140px] md:min-h-[180px]`}>
      <div className="relative z-10 flex flex-col h-full justify-between">
        {/* Content */}
        <div>
          <h3 className="text-lg md:text-xl font-bold text-primary-foreground mb-1 font-heading">
            {title}
          </h3>
          {subtitle && (
            <p className="text-primary-foreground/80 text-xs md:text-sm mb-2">
              {subtitle}
            </p>
          )}
          {discount && (
            <span className="inline-block px-2 py-1 bg-card/90 text-foreground text-xs md:text-sm font-bold rounded">
              {discount}
            </span>
          )}
        </div>
        
        <button 
          onClick={onCtaClick}
          className="mt-3 px-4 py-1.5 bg-card text-foreground rounded-lg font-medium text-xs md:text-sm hover:bg-card/90 transition-colors w-fit"
        >
          {ctaText}
        </button>
      </div>

      {/* Decorative circle */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full" />
    </div>
  );
};

export default PromoBanner;
