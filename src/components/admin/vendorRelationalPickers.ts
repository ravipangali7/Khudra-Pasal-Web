import { vendorApi, extractResults } from '@/lib/api';
import type { AdminSearchOption } from './AdminSearchCombobox';

function matchesSearch(label: string, search: string): boolean {
  if (!search.trim()) return true;
  return label.toLowerCase().includes(search.trim().toLowerCase());
}

export async function fetchCategoryVendorOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await vendorApi.catalogCategories();
  const rows = extractResults<{ id: string; name: string }>(res);
  return rows
    .filter((c) => matchesSearch(String(c.name), search))
    .slice(0, 80)
    .map((c) => ({ value: String(c.id), label: String(c.name) }));
}

export async function fetchBrandVendorOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await vendorApi.catalogBrands();
  const rows = extractResults<{ id: string; name: string }>(res);
  return rows
    .filter((b) => matchesSearch(String(b.name), search))
    .slice(0, 80)
    .map((b) => ({ value: String(b.id), label: String(b.name) }));
}

export async function fetchUnitVendorOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await vendorApi.catalogUnits();
  const rows = extractResults<{ id: string; name: string; short_name?: string }>(res);
  return rows
    .filter((u) => {
      const label = u.short_name ? `${u.name} (${u.short_name})` : String(u.name);
      return matchesSearch(label, search);
    })
    .slice(0, 80)
    .map((u) => ({
      value: String(u.id),
      label: u.short_name ? `${u.name} (${u.short_name})` : String(u.name),
    }));
}
