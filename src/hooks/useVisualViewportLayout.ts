import { useEffect, useState } from 'react';

export type VisualViewportLayout = {
  /** Distance from layout viewport top to visual viewport top (px). */
  top: number;
  /** Visual viewport height (px). */
  height: number;
  /** Approximate keyboard overlap from the bottom of the layout viewport (px). */
  keyboardInset: number;
};

const DEFAULT_LAYOUT: VisualViewportLayout = {
  top: 0,
  height: typeof window !== 'undefined' ? window.innerHeight : 0,
  keyboardInset: 0,
};

/**
 * Tracks `window.visualViewport` so fixed mobile panels (chat, drawers) can sit above the
 * on-screen keyboard instead of behind it.
 */
export function useVisualViewportLayout(enabled: boolean): VisualViewportLayout {
  const [layout, setLayout] = useState<VisualViewportLayout>(DEFAULT_LAYOUT);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setLayout(DEFAULT_LAYOUT);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const overlap = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      setLayout({
        top: vv.offsetTop,
        height: vv.height,
        keyboardInset: overlap > 12 ? overlap : 0,
      });
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      setLayout(DEFAULT_LAYOUT);
    };
  }, [enabled]);

  return layout;
}
