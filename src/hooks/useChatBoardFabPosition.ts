import { useEffect } from 'react';
import { repositionChatBoardFab } from '@/lib/chatBoardFabLayout';
import { useNativeAppShell } from '@/hooks/useNativeAppShell';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Keeps third-party / chatboard launchers above the mobile tab bar (Flutter shell + mobile web).
 */
export function useChatBoardFabPosition(enabled = true): void {
  const inNativeApp = useNativeAppShell();
  const isMobile = useIsMobile();
  const active = enabled && (inNativeApp || isMobile);

  useEffect(() => {
    if (!active) return;

    repositionChatBoardFab();

    const interval = window.setInterval(repositionChatBoardFab, 800);
    const observer = new MutationObserver(() => repositionChatBoardFab());
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('resize', repositionChatBoardFab);
    window.visualViewport?.addEventListener('resize', repositionChatBoardFab);

    return () => {
      window.clearInterval(interval);
      observer.disconnect();
      window.removeEventListener('resize', repositionChatBoardFab);
      window.visualViewport?.removeEventListener('resize', repositionChatBoardFab);
    };
  }, [active]);
}
