import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  /** No tap-to-pause overlay; no full-screen click layer (MP4/TikTok immersive). */
  minimalChrome?: boolean;
  /** Active: auto; neighbors: metadata; far: none (performance). */
  preload?: 'auto' | 'metadata' | 'none';
}

function isTiktokEmbedOrigin(origin: string): boolean {
  try {
    const h = new URL(origin).hostname;
    return h === 'tiktok.com' || h.endsWith('.tiktok.com');
  } catch {
    return false;
  }
}

function extractTikTokPostId(url: string): string | null {
  const m = url.match(/video\/(\d+)/);
  return m?.[1] ?? null;
}

function buildTikTokPlayerUrl(postId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    loop: '1',
    controls: '0',
    progress_bar: '0',
    play_button: '0',
    volume_control: '0',
    fullscreen_button: '0',
    timestamp: '0',
    music_info: '0',
    description: '0',
    closed_caption: '0',
    rel: '0',
  });
  return `https://www.tiktok.com/player/v1/${postId}?${params.toString()}`;
}

function postToTiktokPlayer(win: Window | null | undefined, type: string, value?: unknown) {
  if (!win) return;
  const payload: Record<string, unknown> = { type, 'x-tiktok-player': true };
  if (value !== undefined) payload.value = value;
  win.postMessage(payload, '*');
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
  minimalChrome = false,
  preload = 'auto',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const tiktokIframeRef = useRef<HTMLIFrameElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [playIconState, setPlayIconState] = useState<'play' | 'pause'>('play');
  const [isLoading, setIsLoading] = useState(true);
  const [canPlay, setCanPlay] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [tiktokReady, setTiktokReady] = useState(false);
  const [tiktokPlaying, setTiktokPlaying] = useState(false);

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

  useEffect(() => {
    if (platform !== 'tiktok') return;
    setTiktokReady(false);
    setTiktokPlaying(false);
  }, [platform, videoUrl]);

  useEffect(() => {
    if (platform !== 'tiktok') return;

    const onMessage = (event: MessageEvent) => {
      if (!isTiktokEmbedOrigin(event.origin)) return;
      if (event.source !== tiktokIframeRef.current?.contentWindow) return;
      const data = event.data as Record<string, unknown> | null;
      const xt = data?.['x-tiktok-player'];
      if (!data || (xt !== true && xt !== 'true') || typeof data.type !== 'string') return;

      switch (data.type) {
        case 'onPlayerReady':
          setTiktokReady(true);
          break;
        case 'onStateChange': {
          const s = (typeof data.value === 'number' ? data.value : data.data) as number;
          if (s === 1) setTiktokPlaying(true);
          if (s === 2) setTiktokPlaying(false);
          // Embed loop=1 may still fire ended; restart in place (TikTok-owned chrome not fully hideable).
          if (s === 0) {
            const win = tiktokIframeRef.current?.contentWindow;
            if (win) {
              postToTiktokPlayer(win, 'seekTo', 0);
              postToTiktokPlayer(win, 'play');
            } else {
              onEnded?.();
            }
          }
          break;
        }
        case 'onCurrentTime': {
          const v = (data.value ?? data.data) as { currentTime?: number; duration?: number } | undefined;
          if (!v || typeof v.currentTime !== 'number') return;
          const duration = typeof v.duration === 'number' && v.duration > 0 ? v.duration : 0;
          if (!duration) return;
          const progress = Math.min(100, Math.max(0, (v.currentTime / duration) * 100));
          onProgress?.(progress);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [platform, onProgress, onEnded]);

  useEffect(() => {
    if (platform !== 'tiktok' || !tiktokReady) return;
    const win = tiktokIframeRef.current?.contentWindow;
    if (!win) return;

    if (isActive) {
      postToTiktokPlayer(win, 'play');
    } else {
      postToTiktokPlayer(win, 'pause');
      postToTiktokPlayer(win, 'seekTo', 0);
    }
    postToTiktokPlayer(win, isMuted ? 'mute' : 'unMute');
  }, [platform, tiktokReady, isActive, isMuted]);

  useEffect(() => {
    if (platform !== 'tiktok') return;
    if (!isActive) setTiktokPlaying(false);
  }, [platform, isActive]);

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

  const handleTikTokTap = useCallback(() => {
    const win = tiktokIframeRef.current?.contentWindow;
    if (!win || !tiktokReady) return;

    if (tiktokPlaying) {
      postToTiktokPlayer(win, 'pause');
      setPlayIconState('pause');
      onTogglePlay?.(false);
    } else {
      postToTiktokPlayer(win, 'play');
      setPlayIconState('play');
      onTogglePlay?.(true);
    }

    setShowPlayIcon(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowPlayIcon(false), 800);
  }, [tiktokReady, tiktokPlaying, onTogglePlay]);

  const getEmbedUrl = (url: string, plat: string) => {
    if (plat === 'youtube') {
      const id = url.match(/(?:shorts\/|v=)([^&?\s]+)/)?.[1];
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&controls=0&modestbranding=1&playlist=${id}`;
    }
    if (plat === 'tiktok') {
      const postId = extractTikTokPostId(url);
      return postId ? buildTikTokPlayerUrl(postId) : '';
    }
    // Instagram: standard embed only — no postMessage API for mute/loop/hiding Meta chrome.
    if (plat === 'instagram') {
      const reelId = url.match(/reel\/([^/?]+)/)?.[1];
      return `https://www.instagram.com/reel/${reelId}/embed`;
    }
    return url;
  };

  if (platform === 'mp4') {
    return (
      <div className="absolute inset-0">
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
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
                    animation: 'shimmer 1.5s infinite',
                  }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-10 h-10 rounded-full border-[3px] border-white/10 animate-spin"
                  style={{ borderTopColor: 'var(--reels-accent)' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!minimalChrome && <div className="absolute inset-0 z-[1]" onClick={handleTap} />}

        <video
          ref={videoRef}
          src={videoUrl}
          muted={isMuted}
          playsInline
          loop
          preload={preload}
          onCanPlay={() => {
            setCanPlay(true);
            setIsLoading(false);
          }}
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

        {!minimalChrome && (
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
        )}
      </div>
    );
  }

  const embedSrc = getEmbedUrl(videoUrl, platform);
  const isTikTok = platform === 'tiktok';
  const tiktokPostId = isTikTok ? extractTikTokPostId(videoUrl) : null;

  if (isTikTok && !tiktokPostId) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--reels-bg)' }}>
        <p className="reels-font-body text-xs text-white/50 px-4 text-center">Invalid TikTok URL</p>
      </div>
    );
  }

  if (!embedSrc) {
    return (
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--reels-bg)' }}>
        <p className="reels-font-body text-xs text-white/50 px-4 text-center">Unsupported video URL</p>
      </div>
    );
  }

  const tiktokCropStyle: React.CSSProperties = {
    pointerEvents: 'none',
    position: 'absolute',
    width: '130%',
    height: '120%',
    left: '-14%',
    top: '-8%',
    border: 'none',
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {isTikTok ? (
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <iframe
            ref={tiktokIframeRef}
            src={embedSrc}
            className="border-none"
            style={tiktokCropStyle}
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            title="Reel video"
          />
          {/* Hide TikTok-owned edge chrome so only Khudrapasal controls are visible. */}
          <div className="absolute right-0 top-0 h-full w-16 z-[1] bg-[var(--reels-bg)]/70 pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-12 z-[1] bg-gradient-to-b from-[var(--reels-bg)]/65 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-16 z-[1] bg-gradient-to-t from-[var(--reels-bg)]/80 to-transparent pointer-events-none" />
        </div>
      ) : (
        <iframe
          src={embedSrc}
          className="h-full w-full border-none"
          style={{ pointerEvents: 'none' }}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          title="Reel video"
        />
      )}

      {isTikTok && !minimalChrome && (
        <>
          <div
            className="absolute inset-0 z-[2]"
            onClick={handleTikTokTap}
            aria-hidden
          />
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
        </>
      )}
    </div>
  );
};

export default ReelVideoPlayer;
