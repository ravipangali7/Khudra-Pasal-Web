import type { ReactNode } from "react";
import { useWebBrowser } from "@/hooks/useWebBrowser";
import { cn } from "@/lib/utils";

type WebOnlyProps = {
  children: ReactNode;
  className?: string;
  /** Applied on the wrapper for CSS fail-safe hiding in the native shell. */
  promo?: boolean;
};

/**
 * Renders children only in the public web storefront (not Flutter WebView).
 * Use `promo` for marketing UI so `html.native-app-shell .web-promo` can hide it before React hydrates.
 */
export function WebOnly({ children, className, promo = false }: WebOnlyProps) {
  const isWeb = useWebBrowser();
  if (!isWeb) return null;
  return <div className={cn(promo && "web-promo", className)}>{children}</div>;
}
