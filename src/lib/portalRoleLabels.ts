import type { PortalSwitchTarget } from "@/lib/api";

export function portalRoleDisplayLabel(role: string | undefined | null): string {
  const r = (role || "").trim().toLowerCase();
  if (r === "parent") return "Parent";
  if (r === "child") return "Child";
  return "Normal (Customer)";
}

export function portalSwitchTargetLabel(target: PortalSwitchTarget): string {
  if (target === "parent") return "Parent";
  if (target === "child") return "Child";
  return "Normal (Customer)";
}

export const PORTAL_SWITCHED_EVENT = "khudra-portal-switched";

export function dispatchPortalSwitched(detail: { role: string; redirect: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PORTAL_SWITCHED_EVENT, { detail }));
}
