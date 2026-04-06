/** Recharts colors aligned with design tokens (see index.css --primary / --secondary). */
export const CHART_PRIMARY = "hsl(var(--primary))";
export const CHART_SECONDARY = "hsl(var(--secondary))";
export const CHART_MUTED = "hsl(var(--muted-foreground))";
export const CHART_GRID = "hsl(var(--border))";
export const CHART_CARD_BG = "hsl(var(--card))";

export const chartTooltipStyle = {
  background: CHART_CARD_BG,
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
} as const;

export const chartAxisTick = { fill: CHART_MUTED, fontSize: 12 };

/** Extra slice colors for pie / multi-series (harmonize with brand). */
export const CHART_PALETTE = [
  CHART_PRIMARY,
  CHART_SECONDARY,
  "hsl(142 71% 45%)",
  "hsl(217 91% 60%)",
  "hsl(32 92% 48%)",
  "hsl(347 77% 50%)",
];
