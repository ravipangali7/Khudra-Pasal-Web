import { useIsMobile } from '@/hooks/use-mobile';
import { useNativeAppShell } from '@/hooks/useNativeAppShell';

/** True on narrow viewports or inside the Flutter WebView shell. */
export function useMobileUx(): boolean {
  const isMobile = useIsMobile();
  const inNativeApp = useNativeAppShell();
  return isMobile || inNativeApp;
}
