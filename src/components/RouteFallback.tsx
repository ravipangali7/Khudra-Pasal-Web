import { Loader2 } from "lucide-react";

/** Shown while lazy route chunks load (portals, admin, vendor). */
export default function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">Loading page</span>
    </div>
  );
}
