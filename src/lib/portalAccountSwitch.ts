import type { PortalMe, PortalSwitchPortalContext, PortalSwitchTarget } from "@/lib/api";

export type PortalAccountSurface = "main" | "family" | "child";

export type PortalAccountSwitchOption = {
  surface: PortalAccountSurface;
  target: PortalSwitchTarget;
  label: string;
  description: string;
  href: string;
};

export function portalSwitchTargetToSurface(target: PortalSwitchTarget): PortalAccountSurface {
  if (target === "parent") return "family";
  if (target === "child") return "child";
  return "main";
}

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
      target: "normal",
      label: "Normal (Customer)",
      description: "Shop and use your personal wallet as a regular customer",
      href: portalAccountDashboardHref("main"),
    });
  }
  if (ctx.has_family_portal_access) {
    out.push({
      surface: "family",
      target: "parent",
      label: "Parent",
      description: "Manage family members, shared wallets, and limits",
      href: portalAccountDashboardHref("family"),
    });
  }
  if (ctx.has_child_portal_access) {
    out.push({
      surface: "child",
      target: "child",
      label: "Child",
      description: "Child wallet and parent-approved purchases",
      href: portalAccountDashboardHref("child"),
    });
  }
  return out;
}

export function portalAccountSwitchConfirmCopy(target: PortalSwitchTarget): {
  title: string;
  description: string;
} {
  if (target === "normal") {
    return {
      title: "Switch to Normal (Customer)?",
      description:
        "You will use the customer portal as a regular shopper. Your family group membership is not changed — you stay in the same family.",
    };
  }
  if (target === "parent") {
    return {
      title: "Switch to Parent?",
      description:
        "You will use the family (parent) portal to manage members, wallets, and spending controls.",
    };
  }
  return {
    title: "Switch to Child?",
    description: "You will use the child portal with your assigned wallet and purchase rules.",
  };
}

/** Show switch menu when KYC is verified and at least one portal mode is available. */
export function portalAccountSwitchMenuEligible(
  me: Pick<PortalMe, "kyc_status" | "kyc_required"> | null | undefined,
  ctx: PortalSwitchPortalContext | null | undefined,
): boolean {
  if (!portalAccountKycVerified(me)) return false;
  return buildPortalAccountSwitchOptions(ctx).length > 0;
}

export function isPortalSwitchOptionActive(
  opt: PortalAccountSwitchOption,
  ctx: PortalSwitchPortalContext | null | undefined,
  currentSurface: PortalAccountSurface,
): boolean {
  const active = ctx?.active_target;
  if (active) return opt.target === active;
  return opt.surface === currentSurface;
}
