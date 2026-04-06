import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'khudra_reels_muted';

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function readMuted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  listeners.add(onStoreChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

function getServerSnapshot(): boolean {
  return true;
}

/**
 * Global reels mute preference: default muted (autoplay-friendly).
 * When the user unmutes once, preference is stored and applies to all reel surfaces.
 */
export function useReelsMutePreference(): [boolean, () => void] {
  const isMuted = useSyncExternalStore(subscribe, readMuted, getServerSnapshot);

  const toggleMute = useCallback(() => {
    const next = !readMuted();
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore quota */
    }
    emit();
  }, []);

  return [isMuted, toggleMute];
}
