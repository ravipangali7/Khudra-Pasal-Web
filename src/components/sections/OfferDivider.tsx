import { Sparkles, Gift, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Deal {
  title: string;
  discount?: string;
}

interface OfferDividerProps {
  title: string;
  subtitle?: string;
  deals?: Deal[];
  image?: string;
  bgGradient?: string;
  icon?: 'sparkles' | 'gift' | 'tag';
  className?: string;
}

const OfferDivider = ({
  title,
  subtitle,
  deals = [],
  image,
  bgGradient = 'from-orange-500 via-amber-500 to-purple-500',
  icon = 'sparkles',
  className
}: OfferDividerProps) => {
  const IconComponent = {
    sparkles: Sparkles,
    gift: Gift,
    tag: Tag
  }[icon];

  return (
    <div
      className={cn(
        `relative rounded-2xl overflow-hidden bg-gradient-to-r ${bgGradient} p-4 md:p-6`,
        className
      )}
    >
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Content */}
        <div className="text-center md:text-left flex-1">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <IconComponent className="w-6 h-6 text-white" />
            <h3 className="text-xl md:text-2xl font-bold text-white">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-white/90 text-sm md:text-base mb-3">{subtitle}</p>
          )}
          
          {/* Deals List */}
          {deals.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
              {deals.map((deal, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-medium"
                >
                  {deal.title} {deal.discount && <span className="font-bold">{deal.discount}</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Image */}
        {image && (
          <div className="flex-shrink-0">
            <img
              src={image}
              alt=""
              className="w-24 h-24 md:w-32 md:h-32 object-contain animate-pulse"
            />
          </div>
        )}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
    </div>
  );
};

export default OfferDivider;
