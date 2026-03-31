import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface ReelsAvatarProps {
  name: string;
  verified?: boolean;
  avatar?: string;
  size?: 'sm' | 'md';
}

const ReelsAvatar: React.FC<ReelsAvatarProps> = ({ name, verified, avatar, size = 'sm' }) => {
  const sizeMap = { sm: 'w-6 h-6 text-[10px]', md: 'w-8 h-8 text-xs' };
  
  return (
    <div className="flex items-center gap-1.5">
      {avatar ? (
        <img src={avatar} alt={name} className={`${sizeMap[size]} rounded-full object-cover`} />
      ) : (
        <div className={`${sizeMap[size]} rounded-full flex items-center justify-center font-bold`} style={{ background: 'var(--reels-accent)' }}>
          {name.charAt(0)}
        </div>
      )}
      <span className="reels-font-body text-xs" style={{ color: 'var(--reels-text-secondary)' }}>
        @{name}
      </span>
      {verified && <BadgeCheck className="w-3.5 h-3.5" style={{ color: 'var(--reels-accent)' }} />}
    </div>
  );
};

export default ReelsAvatar;
