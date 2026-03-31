import { ChevronRight } from 'lucide-react';

interface PromoDividerProps {
  title: string;
  subtitle?: string;
  bgGradient?: string;
  textColor?: string;
  image?: string;
  onClick?: () => void;
}

const PromoDivider = ({ 
  title, 
  subtitle, 
  bgGradient = 'from-purple-500 to-pink-500',
  textColor = 'text-white',
  image,
  onClick 
}: PromoDividerProps) => {
  return (
    <div 
      className={`w-full rounded-2xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity relative`}
      onClick={onClick}
    >
      {image ? (
        <>
          <img src={image} alt={title} className="w-full h-[160px] md:h-[200px] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center px-6">
            <div>
              <h3 className="text-xl md:text-2xl font-bold mb-1 text-white">{title}</h3>
              {subtitle && <p className="text-sm text-white/90">{subtitle}</p>}
            </div>
            <div className="ml-auto w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
          </div>
        </>
      ) : (
        <div className={`p-6 bg-gradient-to-r ${bgGradient} ${textColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl md:text-2xl font-bold mb-1">{title}</h3>
              {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoDivider;
