import type { PortalMe, PortalSwitchPortalContext, PortalSwitchTarget } from "@/lib/api";

export type PortalAccountSurface = "main" | "family" | "child";

export type PortalAccountSwitchOption = {
  surface: PortalAccountSurface;
  target: PortalSwitchTarget;
  label: string;
  description: string;
  href: string;
};

const ALL_PORTAL_SWITCH_OPTIONS: PortalAccountSwitchOption[] = [
  {
    surface: "main",
    target: "normal",
    label: "Normal (Customer)",
    description: "Shop and use your personal wallet as a regular customer",
    href: "/portal/dashboard",
  },
  {
    surface: "family",
    target: "parent",
    label: "Parent",
    description: "Manage family members, shared wallets, and limits",
    href: "/family-portal/dashboard",
  },
  {
    surface: "child",
    target: "child",
    label: "Child",
    description: "Child wallet and parent-approved purchases",
    href: "/child-portal/dashboard",
  },
];

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

/** Always show Parent, Child, and Normal in the switcher menu. */
export function buildPortalAccountSwitchOptions(
  _ctx?: PortalSwitchPortalContext | null,
): PortalAccountSwitchOption[] {
  return ALL_PORTAL_SWITCH_OPTIONS;
}

export function isPortalSwitchOptionAvailable(
  opt: PortalAccountSwitchOption,
  ctx: PortalSwitchPortalContext | null | undefined,
): boolean {
  if (!ctx) return opt.target === "normal";
  if (opt.target === "normal") return ctx.has_normal_portal_access !== false;
  if (opt.target === "parent") return Boolean(ctx.has_family_portal_access);
  return Boolean(ctx.has_child_portal_access);
}

export function portalSwitchUnavailableMessage(target: PortalSwitchTarget): string {
  if (target === "parent") {
    return "Parent portal requires an active family group. Create or join a family first.";
  }
  if (target === "child") {
    return "Child portal requires a family invite. Ask your parent to add you or accept an invite.";
  }
  return "Customer portal is not available for this account.";
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

export function portalAccountSwitchMenuEligible(
  me: Pick<PortalMe, "kyc_status" | "kyc_required"> | null | undefined,
): boolean {
  return portalAccountKycVerified(me);
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

export async function invalidatePortalSessionQueries(
  queryClient: { invalidateQueries: (opts: { queryKey: string[] }) => Promise<unknown> },
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["portal"] }),
    queryClient.invalidateQueries({ queryKey: ["auth", "session-home"] }),
    queryClient.invalidateQueries({ queryKey: ["website", "header-portal-session"] }),
  ]);
}
