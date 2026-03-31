import { adminApi, extractResults } from '@/lib/api';
import type { AdminSearchOption } from './AdminSearchCombobox';

type UserRow = { id: number; name: string; phone?: string; email?: string };

export async function fetchUserAdminOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await adminApi.users({ search: search || undefined, page_size: 40 });
  const rows = extractResults(res) as UserRow[];
  return rows.map((u) => ({
    value: String(u.id),
    label: u.name,
    description: [u.phone, u.email].filter(Boolean).join(' · ') || undefined,
  }));
}

type VendorRow = { id: string; name: string; owner?: string };

export async function fetchVendorAdminOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await adminApi.vendors({ search: search || undefined, page_size: 40 });
  const rows = extractResults(res) as VendorRow[];
  return rows.map((v) => ({
    value: String(v.id),
    label: String(v.name),
    description: v.owner ? String(v.owner) : undefined,
  }));
}

type VendorProductRow = { id: string; name: string; sku?: string };

export async function fetchVendorProductAdminOptions(
  vendorId: string,
  search: string,
): Promise<AdminSearchOption[]> {
  if (!vendorId.trim()) return [];
  const res = await adminApi.products({
    search: search || undefined,
    seller_id: vendorId,
    page_size: 40,
  });
  const rows = extractResults(res) as VendorProductRow[];
  return rows.map((p) => ({
    value: String(p.id),
    label: String(p.name),
    description: p.sku ? String(p.sku) : undefined,
  }));
}

type WalletRow = { id: string; owner: string; type?: string; balance?: number };

export async function fetchWalletAdminOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await adminApi.wallets({ search: search || undefined, page_size: 40 });
  const rows = extractResults(res) as WalletRow[];
  return rows.map((w) => ({
    value: String(w.id),
    label: `${w.owner} · ${String(w.type ?? '')}`,
    description: `Rs. ${Number(w.balance ?? 0).toLocaleString()} · #${w.id}`,
  }));
}

type CategoryRow = { id: string; name: string; parent?: string; level?: number };

export async function fetchCategoryAdminOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await adminApi.categories({ search: search || undefined, page_size: 40 });
  const rows = extractResults(res) as CategoryRow[];
  return rows.map((c) => ({
    value: String(c.id),
    label: String(c.name),
    description: c.parent && c.parent !== '-' ? String(c.parent) : undefined,
  }));
}

/** Parent picker for subcategories (top-level categories only). */
export async function fetchTopCategoryAdminOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await adminApi.categories({ search: search || undefined, page_size: 80 });
  const rows = extractResults(res) as CategoryRow[];
  return rows
    .filter((c) => c.level === 0)
    .map((c) => ({
      value: String(c.id),
      label: String(c.name),
    }));
}

/** Parent picker for child categories (subcategories / level 1 only). */
export async function fetchSubcategoryParentOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await adminApi.categories({ search: search || undefined, page_size: 80 });
  const rows = extractResults(res) as CategoryRow[];
  return rows
    .filter((c) => c.level === 1)
    .map((c) => ({
      value: String(c.id),
      label: String(c.name),
      description: c.parent && c.parent !== '-' ? String(c.parent) : undefined,
    }));
}

type BrandRow = { id: string; name: string };

export async function fetchBrandAdminOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await adminApi.brands({ search: search || undefined, page_size: 40 });
  const rows = extractResults(res) as BrandRow[];
  return rows.map((b) => ({
    value: String(b.id),
    label: String(b.name),
  }));
}

type UnitRow = { id: string; name: string; shortName?: string };

export async function fetchUnitAdminOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await adminApi.units({ search: search || undefined, page_size: 40 });
  const rows = extractResults(res) as UnitRow[];
  return rows.map((u) => ({
    value: String(u.id),
    label: u.shortName ? `${u.name} (${u.shortName})` : String(u.name),
  }));
}

type ZoneRow = { id: string; name: string; areas?: string };

export async function fetchShippingZoneAdminOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await adminApi.shippingZones({ search: search || undefined, page_size: 40 });
  const rows = extractResults(res) as ZoneRow[];
  return rows.map((z) => ({
    value: String(z.id),
    label: String(z.name),
    description: z.areas ? String(z.areas).slice(0, 80) : undefined,
  }));
}
