import type { PortalMe, PortalSwitchPortalContext } from "@/lib/api";

export type PortalAccountSurface = "main" | "family" | "child";

export type PortalAccountSwitchOption = {
  surface: PortalAccountSurface;
  label: string;
  description: string;
  href: string;
};

export function portalAccountKycVerified(me: Pick<PortalMe, "kyc_status" | "kyc_required"> | null | undefined): boolean {
  if (!me) return false;
  if (me.kyc_required === false) return true;
  return me.kyc_status === "verified";
}

export function portalAccountKycHref(surface: PortalAccountSurface): string {
  if (surface === "family") return "/family-portal/kyc";
  if (surface === "child") return "/child-portal/kyc";
  return "/portal/kyc";
}

export function portalAccountDashboardHref(surface: PortalAccountSurface): string {
  if (surface === "family") return "/family-portal/dashboard";
  if (surface === "child") return "/child-portal/dashboard";
  return "/portal/dashboard";
}

export function buildPortalAccountSwitchOptions(
  ctx: PortalSwitchPortalContext | null | undefined,
): PortalAccountSwitchOption[] {
  if (!ctx) return [];
  const out: PortalAccountSwitchOption[] = [];
  if (ctx.has_normal_portal_access !== false) {
    out.push({
      surface: "main",
      label: "Normal account",
      description: "Customer portal — shop and personal wallet",
      href: portalAccountDashboardHref("main"),
    });
  }
  if (ctx.has_family_portal_access) {
    out.push({
      surface: "family",
      label: "Family account",
      description: "Manage family members, wallets, and limits",
      href: portalAccountDashboardHref("family"),
    });
  }
  if (ctx.has_child_portal_access) {
    out.push({
      surface: "child",
      label: "Child account",
      description: "Child wallet and parent-approved purchases",
      href: portalAccountDashboardHref("child"),
    });
  }
  return out;
}

/** Show switch menu when KYC is verified and another portal type is available. */
export function portalAccountSwitchMenuEligible(
  me: Pick<PortalMe, "kyc_status" | "kyc_required"> | null | undefined,
  ctx: PortalSwitchPortalContext | null | undefined,
  currentSurface: PortalAccountSurface,
): boolean {
  if (!portalAccountKycVerified(me)) return false;
  return buildPortalAccountSwitchOptions(ctx).some((o) => o.surface !== currentSurface);
}
