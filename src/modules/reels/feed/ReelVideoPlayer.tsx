import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReelVideoPlayerProps {
  videoUrl: string;
  platform: 'mp4' | 'youtube' | 'tiktok' | 'instagram';
  isActive: boolean;
  isMuted: boolean;
  onTogglePlay?: (playing: boolean) => void;
  onProgress?: (progress: number) => void;
  onEnded?: () => void;
  thumbnail?: string;
}

const ReelVideoPlayer: React.FC<ReelVideoPlayerProps> = ({
  videoUrl,
  platform,
  isActive,
  isMuted,
  onTogglePlay,
  onProgress,
  onEnded,
  thumbnail,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [playIconState, setPlayIconState] = useState<'play' | 'pause'>('play');
  const [isLoading, setIsLoading] = useState(true);
  const [canPlay, setCanPlay] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || platform !== 'mp4') return;
    
    if (isActive && canPlay) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else if (isActive && !canPlay) {
      video.load();
    } else {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, platform, canPlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || platform !== 'mp4') return;
    const shouldMute = !isActive || isMuted;
    video.muted = shouldMute;
    video.volume = shouldMute ? 0 : 1;
  }, [isMuted, isActive, platform]);

  const handleTap = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
      setIsPlaying(true);
      setPlayIconState('play');
      onTogglePlay?.(true);
    } else {
      video.pause();
      setIsPlaying(false);
      setPlayIconState('pause');
      onTogglePlay?.(false);
    }
    
    setShowPlayIcon(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPlayIcon(false), 800);
  };

  const getEmbedUrl = (url: string, plat: string) => {
    if (plat === 'youtube') {
      const id = url.match(/(?:shorts\/|v=)([^&?\s]+)/)?.[1];
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&controls=0&playlist=${id}`;
    }
    if (plat === 'tiktok') {
      const videoId = url.match(/video\/(\d+)/)?.[1];
      return `https://www.tiktok.com/embed/v2/${videoId}`;
    }
    if (plat === 'instagram') {
      const reelId = url.match(/reel\/([^/?]+)/)?.[1];
      return `https://www.instagram.com/reel/${reelId}/embed`;
    }
    return url;
  };

  if (platform === 'mp4') {
    return (
      <div className="absolute inset-0">
        {/* Thumbnail + shimmer while loading */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 z-[2]"
              style={{ background: 'var(--reels-bg)' }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {thumbnail && (
                <img src={thumbnail} alt="" className="w-full h-full object-cover opacity-60" />
              )}
              {/* Shimmer overlay */}
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                    animation: 'shimmer 1.5s infinite',
                  }}
                />
              </div>
              {/* Loading spinner */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-10 h-10 rounded-full border-[3px] border-white/10 animate-spin"
                  style={{ borderTopColor: 'var(--reels-accent)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invisible tap overlay */}
        <div className="absolute inset-0 z-[1]" onClick={handleTap} />

        <video
          ref={videoRef}
          src={videoUrl}
          muted={isMuted}
          playsInline
          loop
          preload="auto"
          onCanPlay={() => { setCanPlay(true); setIsLoading(false); }}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            const duration = Number.isFinite(video.duration) ? video.duration : 0;
            if (!duration || duration <= 0) return;
            const progress = Math.min(100, Math.max(0, (video.currentTime / duration) * 100));
            onProgress?.(progress);
          }}
          onEnded={() => onEnded?.()}
          className="w-full h-full object-cover"
        />

        {/* Centered play/pause icon with fade-out */}
        <AnimatePresence>
          {showPlayIcon && (
            <motion.div
              className="absolute inset-0 z-[3] flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 0.9, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm">
                {playIconState === 'play' ? (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="white" opacity="0.9">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="white" opacity="0.9">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <iframe
        src={getEmbedUrl(videoUrl, platform)}
        className="w-full h-full border-none"
        style={{ pointerEvents: isActive ? 'auto' : 'none' }}
        allow="autoplay; fullscreen"
        title="Reel video"
      />
    </div>
  );
};

export default ReelVideoPlayer;
