import DashboardModule from "./modules/DashboardModule";
import CatalogModule from "./modules/CatalogModule";
import ProductsModule from "./modules/ProductsModule";
import OrdersModule from "./modules/OrdersModule";
import MarketingModule from "./modules/MarketingModule";
import CMSModule from "./modules/CMSModule";
import FinanceModule from "./modules/FinanceModule";
import UsersModule from "./modules/UsersModule";
import EmployeeModule from "./modules/EmployeeModule";
import DeliveryModule from "./modules/DeliveryModule";
import FamiliesModule from "./modules/FamiliesModule";
import WalletModule from "./modules/WalletModule";
import SecurityModule from "./modules/SecurityModule";
import ReportsModule from "./modules/ReportsModule";
import ShippingModule from "./modules/ShippingModule";
import POBillingModule from "./modules/POBillingModule";
import SettingsModule from "./modules/SettingsModule";
import AccountProfileModule from "./modules/AccountProfileModule";
import AdminSuppliersModule from "./modules/inventory/AdminSuppliersModule";
import AdminStockPurchasesModule from "./modules/inventory/AdminStockPurchasesModule";
import AdminLedgerModule from "./modules/inventory/AdminLedgerModule";
import SupportTicketsModule from "./modules/SupportTicketsModule";
import POSSystem from "@/components/admin/POSSystem";
import AdminReelsModule from "@/modules/reels/admin/AdminReelsModule";

type RenderCtx = { activeSection: string; setActiveSection: (v: string) => void };
export type AdminCrudAction = "list" | "add" | "edit" | "view";
export type AdminRouteState = {
  moduleId: string;
  action: AdminCrudAction;
  itemId?: string;
};

const list = (ids: string[], render: (ctx: RenderCtx) => JSX.Element) =>
  ids.map((id) => [id, render] as const);

const ENTRIES = [
  ["dashboard", (ctx: RenderCtx) => <DashboardModule onNavigate={ctx.setActiveSection} />] as const,
  ["pos", () => <POSSystem />] as const,
  ...list(["categories", "subcategories", "child-categories", "brands", "attributes", "units"], (ctx) => (
    <CatalogModule activeSection={ctx.activeSection} />
  )),
  ...list(["all-products", "inhouse", "product-approvals", "reviews"], (ctx) => (
    <ProductsModule activeSection={ctx.activeSection} />
  )),
  ["po-billing", () => <POBillingModule />] as const,
  ...list(["orders-all", "orders-settings"], (ctx) => <OrdersModule activeSection={ctx.activeSection} />),
  ...list(["banners", "flash-deals", "coupons", "notifications"], (ctx) => (
    <MarketingModule activeSection={ctx.activeSection} />
  )),
  ["cms", () => <CMSModule />] as const,
  ...list(["transactions", "refunds", "withdrawals", "commission-log"], (ctx) => (
    <FinanceModule activeSection={ctx.activeSection} />
  )),
  ...list(["admins", "customers", "sellers", "users-kyc"], (ctx) => <UsersModule activeSection={ctx.activeSection} />),
  ["suppliers", () => <AdminSuppliersModule />] as const,
  ["stock-purchases", () => <AdminStockPurchasesModule />] as const,
  ["ledger", () => <AdminLedgerModule />] as const,
  ...list(["employees-all", "roles", "audit-logs"], (ctx) => <EmployeeModule activeSection={ctx.activeSection} />),
  ["delivery", () => <DeliveryModule />] as const,
  ...list(["families", "families-all", "families-wallets"], (ctx) => <FamiliesModule activeSection={ctx.activeSection} />),
  ...list(["wallet-master", "wallet-overview", "wallet-settings", "wallet-flagged", "wallet-bonus", "wallet-loyalty"], (ctx) => (
    <WalletModule activeSection={ctx.activeSection} />
  )),
  ["support-tickets", () => <SupportTicketsModule />] as const,
  ["security", () => <SecurityModule />] as const,
  ["reels-admin", () => <AdminReelsModule />] as const,
  ["reports", () => <ReportsModule />] as const,
  ...list(["shipping", "shipping-methods", "shipping-zones", "shipping-calculator"], (ctx) => (
    <ShippingModule activeSection={ctx.activeSection} />
  )),
  ["settings", () => <SettingsModule />] as const,
  ["account-profile", () => <AccountProfileModule />] as const,
] as const;

const MODULE_MAP = new Map(ENTRIES);
const MODULE_IDS = ENTRIES.map(([id]) => id);
const ID_SET = new Set(MODULE_IDS);

const MODULE_SLUG_OVERRIDES: Record<string, string> = {
  "all-products": "products",
  "orders-all": "orders",
  "employees-all": "employees",
  "families-all": "families",
  "wallet-master": "wallet",
  "reels-admin": "reels",
};

const SLUG_TO_ID = new Map<string, string>();
for (const id of MODULE_IDS) {
  const slug = MODULE_SLUG_OVERRIDES[id] ?? id;
  if (!SLUG_TO_ID.has(slug)) {
    SLUG_TO_ID.set(slug, id);
  }
}
if (!SLUG_TO_ID.has("inventory")) {
  SLUG_TO_ID.set("inventory", "suppliers");
}

export function renderAdminModule(activeSection: string, setActiveSection: (v: string) => void) {
  const render = MODULE_MAP.get(activeSection) ?? MODULE_MAP.get("dashboard");
  return render!({ activeSection, setActiveSection });
}

export function getDefaultAdminModuleId() {
  return "dashboard";
}

export function getAdminModuleIds() {
  return [...MODULE_IDS];
}

export function getAdminSlugForModuleId(moduleId: string) {
  return MODULE_SLUG_OVERRIDES[moduleId] ?? moduleId;
}

export function getAdminModuleIdFromSlug(slug: string) {
  return SLUG_TO_ID.get(slug) ?? slug;
}

export function isKnownAdminModuleId(moduleId: string) {
  return ID_SET.has(moduleId);
}

export function buildAdminModulePath(moduleId: string, action: AdminCrudAction = "list", itemId?: string) {
  const slug = getAdminSlugForModuleId(moduleId);
  if (action === "add") return `/admin/${slug}/add`;
  if (action === "edit") return `/admin/${slug}/edit/${itemId ?? ""}`.replace(/\/$/, "");
  if (action === "view") return `/admin/${slug}/view/${itemId ?? ""}`.replace(/\/$/, "");
  return `/admin/${slug}`;
}

export function parseAdminPath(pathname: string): AdminRouteState {
  const parts = pathname.split("/").filter(Boolean);
  const slug = parts[1] ?? getAdminSlugForModuleId(getDefaultAdminModuleId());
  const actionPart = parts[2];
  const itemId = parts[3];
  const moduleId = getAdminModuleIdFromSlug(slug);
  const action: AdminCrudAction =
    actionPart === "add" ? "add" : actionPart === "edit" ? "edit" : actionPart === "view" ? "view" : "list";
  return { moduleId, action, itemId };
}

