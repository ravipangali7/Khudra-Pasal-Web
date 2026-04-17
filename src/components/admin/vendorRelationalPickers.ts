import { vendorApi, extractResults } from '@/lib/api';
import type { AdminSearchOption } from './AdminSearchCombobox';

function matchesSearch(label: string, search: string): boolean {
  if (!search.trim()) return true;
  return label.toLowerCase().includes(search.trim().toLowerCase());
}

type VendorCategoryRow = {
  id: string;
  name: string;
  parent_id?: string | null;
};

function buildVendorCategoryTree(rows: VendorCategoryRow[]) {
  const byId = new Map<string, VendorCategoryRow>();
  rows.forEach((row) => {
    const id = String(row.id);
    if (!byId.has(id)) {
      byId.set(id, { ...row, id });
    }
  });

  const toLabel = (id: string): string => {
    const seen = new Set<string>();
    const chain: string[] = [];
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.push(String(current.name));
      const parentId = current.parent_id ? String(current.parent_id) : '';
      current = parentId ? byId.get(parentId) : undefined;
    }
    return chain.reverse().join(' > ');
  };

  const toDepth = (id: string): number => {
    let depth = 0;
    const seen = new Set<string>();
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      const parentId = current.parent_id ? String(current.parent_id) : '';
      if (!parentId) break;
      depth += 1;
      current = byId.get(parentId);
    }
    return depth;
  };

  return Array.from(byId.values()).map((row) => {
    const id = String(row.id);
    return {
      value: id,
      label: String(row.name),
      description: toLabel(id),
      parentValue: row.parent_id ? String(row.parent_id) : undefined,
      depth: toDepth(id),
    };
  });
}

export async function fetchCategoryVendorOptions(search: string): Promise<AdminSearchOption[]> {
  const res = await vendorApi.catalogCategories();
  const rows = extractResults<VendorCategoryRow>(res);
  const normalizedSearch = search.trim().toLowerCase();
  return buildVendorCategoryTree(rows)
    .filter((c) => matchesSearch(c.label, search))
    .filter((c) => {
      if (!normalizedSearch) return true;
      return String(c.description ?? '').toLowerCase().includes(normalizedSearch) || matchesSearch(c.label, search);
    })
    .slice(0, 80);
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
