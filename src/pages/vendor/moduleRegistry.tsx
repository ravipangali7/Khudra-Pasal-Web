import VendorDashboardModule from "./modules/VendorDashboardModule";
import VendorStoreModule from "./modules/VendorStoreModule";
import VendorProductsModule from "./modules/VendorProductsModule";
import VendorReviewsModule from "./modules/VendorReviewsModule";
import VendorOrdersModule from "./modules/VendorOrdersModule";
import VendorPOSModule from "./modules/VendorPOSModule";
import VendorWalletModule from "./modules/VendorWalletModule";
import VendorReelsModule from "./modules/VendorReelsModule";
import VendorCustomersModule from "./modules/VendorCustomersModule";
import VendorReportsModule from "./modules/VendorReportsModule";
import VendorSupportModule from "./modules/VendorSupportModule";
import VendorKycModule from "./modules/VendorKycModule";

export type VendorCrudAction = "list" | "add" | "edit" | "view";

export type VendorRouteState = {
  moduleId: string;
  action: VendorCrudAction;
  itemId?: string;
};

export type VendorRenderCtx = {
  activeSection: string;
  setActiveSection: (id: string) => void;
};

const ENTRIES = [
  ["dashboard", () => <VendorDashboardModule />] as const,
  ["store", () => <VendorStoreModule />] as const,
  ["all-products", (ctx: VendorRenderCtx) => <VendorProductsModule activeSection={ctx.activeSection} />] as const,
  ["reviews", () => <VendorReviewsModule />] as const,
  ["all-orders", (ctx: VendorRenderCtx) => <VendorOrdersModule activeSection={ctx.activeSection} />] as const,
  ["pending", (ctx: VendorRenderCtx) => <VendorOrdersModule activeSection={ctx.activeSection} />] as const,
  ["returns", () => <VendorOrdersModule activeSection="returns" />] as const,
  ["pos", () => <VendorPOSModule />] as const,
  ["earnings", (ctx: VendorRenderCtx) => <VendorWalletModule activeSection={ctx.activeSection} />] as const,
  ["wallet", (ctx: VendorRenderCtx) => <VendorWalletModule activeSection={ctx.activeSection} />] as const,
  ["payout-accounts", (ctx: VendorRenderCtx) => <VendorWalletModule activeSection={ctx.activeSection} />] as const,
  ["withdrawals", (ctx: VendorRenderCtx) => <VendorWalletModule activeSection={ctx.activeSection} />] as const,
  ["kyc", () => <VendorKycModule />] as const,
  ["transactions", (ctx: VendorRenderCtx) => <VendorWalletModule activeSection={ctx.activeSection} />] as const,
  ["my-reels", () => <VendorReelsModule />] as const,
  ["customers", () => <VendorCustomersModule />] as const,
  ["reports", () => <VendorReportsModule />] as const,
  ["tickets", () => <VendorSupportModule />] as const,
] as const;

const MODULE_MAP = new Map<string, (ctx: VendorRenderCtx) => JSX.Element>(
  ENTRIES.map(([id, r]) => [id, r]),
);

const MODULE_IDS = ENTRIES.map(([id]) => id);
const ID_SET = new Set(MODULE_IDS);

/** Parent nav ids that should redirect to a default child */
const PARENT_REDIRECT: Record<string, string> = {
  products: "all-products",
  orders: "all-orders",
  reels: "my-reels",
  support: "tickets",
};

export function getDefaultVendorModuleId() {
  return "dashboard";
}

export function isKnownVendorModuleId(moduleId: string) {
  return ID_SET.has(moduleId);
}

export function resolveVendorModuleIdFromPath(slug: string | undefined) {
  if (!slug) return getDefaultVendorModuleId();
  if (slug === "add-product") return "all-products";
  if (PARENT_REDIRECT[slug]) return PARENT_REDIRECT[slug];
  return slug;
}

export function buildVendorModulePath(
  moduleId: string,
  action: VendorCrudAction = "list",
  itemId?: string,
) {
  if (moduleId === "all-products") {
    if (action === "add") return "/vendor/all-products/add";
    if (action === "edit" && itemId) return `/vendor/all-products/edit/${itemId}`.replace(/\/$/, "");
    return "/vendor/all-products";
  }
  return `/vendor/${moduleId}`;
}

/** @deprecated Prefer parseVendorRoute — returns module id only (first segment). */
export function parseVendorPath(pathname: string): string {
  return parseVendorRoute(pathname).moduleId;
}

export function parseVendorRoute(pathname: string): VendorRouteState {
  const parts = pathname.split("/").filter(Boolean);
  const rawSlug = parts[1];
  /** Legacy nav key: sidebar uses id `add-product` → `/vendor/add-product`. */
  if (rawSlug === "add-product") {
    return { moduleId: "all-products", action: "add" };
  }
  const moduleId = resolveVendorModuleIdFromPath(rawSlug);

  if (moduleId === "all-products") {
    const sub = parts[2];
    const id = parts[3];
    if (sub === "add") return { moduleId: "all-products", action: "add" };
    if (sub === "edit" && id) return { moduleId: "all-products", action: "edit", itemId: id };
    return { moduleId: "all-products", action: "list" };
  }

  return { moduleId, action: "list" };
}

export function renderVendorModule(ctx: VendorRenderCtx) {
  const render = MODULE_MAP.get(ctx.activeSection) ?? MODULE_MAP.get("dashboard");
  return render!(ctx);
}
