import React from 'react';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReelsThumbnailProps {
  src: string;
  alt?: string;
  className?: string;
  showPlay?: boolean;
  onClick?: () => void;
}

const ReelsThumbnail: React.FC<ReelsThumbnailProps> = ({ src, alt = '', className = '', showPlay = true, onClick }) => {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl cursor-pointer group ${className}`}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      style={{ borderColor: 'var(--reels-border)', borderWidth: 1 }}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      {showPlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--reels-glass)', backdropFilter: 'blur(8px)' }}>
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ReelsThumbnail;
