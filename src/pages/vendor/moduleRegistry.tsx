import VendorDashboardModule from "./modules/VendorDashboardModule";
import VendorStoreModule from "./modules/VendorStoreModule";
import VendorProductsModule from "./modules/VendorProductsModule";
import VendorReviewsModule from "./modules/VendorReviewsModule";
import VendorOrdersModule from "./modules/VendorOrdersModule";
import VendorPOSModule from "./modules/VendorPOSModule";
import VendorMarketingModule from "./modules/VendorMarketingModule";
import VendorWalletModule from "./modules/VendorWalletModule";
import VendorReelsModule from "./modules/VendorReelsModule";
import VendorAllReelsModule from "./modules/VendorAllReelsModule";
import VendorCustomersModule from "./modules/VendorCustomersModule";
import VendorReportsModule from "./modules/VendorReportsModule";
import VendorSupportModule from "./modules/VendorSupportModule";
import VendorSettingsModule from "./modules/VendorSettingsModule";

export type VendorRenderCtx = {
  activeSection: string;
  setActiveSection: (id: string) => void;
};

const ENTRIES = [
  ["dashboard", () => <VendorDashboardModule />] as const,
  ["store", () => <VendorStoreModule />] as const,
  ["all-products", (ctx: VendorRenderCtx) => <VendorProductsModule activeSection={ctx.activeSection} />] as const,
  ["add-product", (ctx: VendorRenderCtx) => <VendorProductsModule activeSection="all-products" />] as const,
  ["add-product-page", (ctx: VendorRenderCtx) => <VendorProductsModule activeSection={ctx.activeSection} />] as const,
  ["reviews", () => <VendorReviewsModule />] as const,
  ["all-orders", (ctx: VendorRenderCtx) => <VendorOrdersModule activeSection={ctx.activeSection} />] as const,
  ["pending", (ctx: VendorRenderCtx) => <VendorOrdersModule activeSection={ctx.activeSection} />] as const,
  ["returns", () => <VendorOrdersModule activeSection="returns" />] as const,
  ["pos", () => <VendorPOSModule />] as const,
  ["coupons", (ctx: VendorRenderCtx) => <VendorMarketingModule activeSection={ctx.activeSection} />] as const,
  ["flash-deals", (ctx: VendorRenderCtx) => <VendorMarketingModule activeSection={ctx.activeSection} />] as const,
  ["earnings", (ctx: VendorRenderCtx) => <VendorWalletModule activeSection={ctx.activeSection} />] as const,
  ["wallet", (ctx: VendorRenderCtx) => <VendorWalletModule activeSection={ctx.activeSection} />] as const,
  ["withdrawals", (ctx: VendorRenderCtx) => <VendorWalletModule activeSection={ctx.activeSection} />] as const,
  ["transactions", (ctx: VendorRenderCtx) => <VendorWalletModule activeSection={ctx.activeSection} />] as const,
  ["my-reels", (ctx: VendorRenderCtx) => <VendorReelsModule activeSection={ctx.activeSection} />] as const,
  ["upload-reel", (ctx: VendorRenderCtx) => <VendorReelsModule activeSection={ctx.activeSection} />] as const,
  ["all-reels", () => <VendorAllReelsModule />] as const,
  ["customers", () => <VendorCustomersModule />] as const,
  ["reports", () => <VendorReportsModule />] as const,
  ["tickets", (ctx: VendorRenderCtx) => <VendorSupportModule activeSection={ctx.activeSection} />] as const,
  ["faq", (ctx: VendorRenderCtx) => <VendorSupportModule activeSection={ctx.activeSection} />] as const,
  ["settings", () => <VendorSettingsModule />] as const,
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
  marketing: "coupons",
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

export function buildVendorModulePath(moduleId: string) {
  return `/vendor/${moduleId}`;
}

export function parseVendorPath(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const slug = parts[1];
  return resolveVendorModuleIdFromPath(slug);
}

export function renderVendorModule(ctx: VendorRenderCtx) {
  const render = MODULE_MAP.get(ctx.activeSection) ?? MODULE_MAP.get("dashboard");
  return render!(ctx);
}
