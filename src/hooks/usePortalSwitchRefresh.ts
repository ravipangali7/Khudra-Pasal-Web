import { useEffect } from "react";
import { PORTAL_SWITCHED_EVENT } from "@/lib/portalRoleLabels";

/** Refetch portal-scoped UI when the user confirms a portal role switch (same session). */
export function usePortalSwitchRefresh(onRefresh: () => void) {
  useEffect(() => {
    const handler = () => onRefresh();
    window.addEventListener(PORTAL_SWITCHED_EVENT, handler);
    return () => window.removeEventListener(PORTAL_SWITCHED_EVENT, handler);
  }, [onRefresh]);
}
