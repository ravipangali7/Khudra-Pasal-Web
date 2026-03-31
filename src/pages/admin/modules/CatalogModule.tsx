import { useMemo, useState } from 'react';
import {
  Layers, Tag, Palette, Ruler, Edit, Trash2, MoreVertical, Eye, Plus
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { adminApi } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { normalizeHexColor, slugifyText, appendIfDefined, resolveMediaUrl } from '../hooks/adminFormUtils';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import {
  fetchTopCategoryAdminOptions,
  fetchSubcategoryParentOptions,
} from '@/components/admin/adminRelationalPickers';

interface CatalogModuleProps {
  activeSection: string;
}

type CategoryFlat = {
  id: string;
  name: string;
  slug: string;
  products: number;
  status: string;
  parent: string;
  parentId?: string | null;
  level: number;
  sortOrder: number;
  image?: string;
  seoTitle?: string;
  seoDesc?: string;
  grandparent?: string;
};

type AttrRow = { id: string; name: string; type: string; values: number; status: string };
type AttrValRow = { id: string; value: string; sortOrder: number; status: string; attribute_id: string };

export default function CatalogModule({ activeSection }: CatalogModuleProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [categoryImage, setCategoryImage] = useState<File | null>(null);
  const [brandLogo, setBrandLogo] = useState<File | null>(null);
  const [categoryForm, setCategoryForm] = useState<Record<string, any>>({
    name: '',
    slug: '',
    seo_title: '',
    seo_description: '',
    sort_order: 0,
    status: 'active',
    headerColor: '#e91e8e',
    bodyColor: '#f5f5f5',
  });
  const [brandForm, setBrandForm] = useState<Record<string, any>>({ name: '', status: 'active' });
  const [attrDialog, setAttrDialog] = useState<'closed' | 'attribute' | 'value'>('closed');
  const [attrForm, setAttrForm] = useState({ name: '', type: 'dropdown', status: 'active' });
  const [valueForm, setValueForm] = useState({ value: '', sort_order: 0, status: 'active' });
  const [editValueRow, setEditValueRow] = useState<AttrValRow | null>(null);
  const [valueDeleteOpen, setValueDeleteOpen] = useState(false);
  const [valueToDelete, setValueToDelete] = useState<AttrValRow | null>(null);
  const [unitForm, setUnitForm] = useState({
    name: '',
    short_name: '',
    type: 'quantity',
    conversion: '',
    status: 'active',
  });
  const createCategory = useAdminMutation(
    (payload: FormData) => adminApi.createCategory(payload),
    [['admin', 'categories', 'catalog']],
  );
  const updateCategory = useAdminMutation(
    ({ id, payload }: { id: string; payload: FormData }) => adminApi.updateCategory(id, payload),
    [['admin', 'categories', 'catalog']],
  );
  const deleteCategory = useAdminMutation(adminApi.deleteCategory, [['admin', 'categories', 'catalog']]);
  const createBrand = useAdminMutation(
    (payload: FormData) => adminApi.createBrand(payload),
    [['admin', 'brands', 'catalog']],
  );
  const updateBrand = useAdminMutation(
    ({ id, payload }: { id: string; payload: FormData }) => adminApi.updateBrand(id, payload),
    [['admin', 'brands', 'catalog']],
  );
  const deleteBrand = useAdminMutation(adminApi.deleteBrand, [['admin', 'brands', 'catalog']]);
  const createAttribute = useAdminMutation(adminApi.createAttribute, [['admin', 'attributes', 'catalog']]);
  const updateAttribute = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateAttribute(id, payload),
    [['admin', 'attributes', 'catalog']],
  );
  const deleteAttribute = useAdminMutation(adminApi.deleteAttribute, [['admin', 'attributes', 'catalog']]);
  const createAttributeValue = useAdminMutation(
    (payload: Record<string, unknown>) => adminApi.createAttributeValue(payload),
    [
      ['admin', 'attribute-values', 'catalog', selectedAttribute ?? ''],
      ['admin', 'attributes', 'catalog'],
    ],
  );
  const updateAttributeValue = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateAttributeValue(id, payload),
    [
      ['admin', 'attribute-values', 'catalog', selectedAttribute ?? ''],
      ['admin', 'attributes', 'catalog'],
    ],
  );
  const deleteAttributeValue = useAdminMutation(
    (id: string) => adminApi.deleteAttributeValue(id),
    [
      ['admin', 'attribute-values', 'catalog', selectedAttribute ?? ''],
      ['admin', 'attributes', 'catalog'],
    ],
  );
  const createUnit = useAdminMutation(adminApi.createUnit, [['admin', 'units', 'catalog']]);
  const updateUnit = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateUnit(id, payload),
    [['admin', 'units', 'catalog']],
  );
  const deleteUnit = useAdminMutation(adminApi.deleteUnit, [['admin', 'units', 'catalog']]);

  const catEnabled = ['categories', 'subcategories', 'child-categories'].includes(activeSection);
  const { data: flatCategories = [] } = useAdminList<CategoryFlat>(
    ['admin', 'categories', 'catalog'],
    () => adminApi.categories({ page_size: 500 }),
    { enabled: catEnabled },
  );

  const byId = useMemo(() => new Map(flatCategories.map((c) => [c.id, c])), [flatCategories]);
  const topCategories = useMemo(() => flatCategories.filter((c) => c.level === 0), [flatCategories]);
  const subRows = useMemo(() => flatCategories.filter((c) => c.level === 1), [flatCategories]);
  const childRows = useMemo(
    () =>
      flatCategories
        .filter((c) => c.level === 2)
        .map((c) => {
          const parentRow = c.parentId ? byId.get(c.parentId) : undefined;
          const gp =
            parentRow?.parentId ? byId.get(parentRow.parentId) : undefined;
          return {
            ...c,
            grandparent: gp?.name ?? '—',
            sortOrder: c.sortOrder ?? 0,
          };
        }),
    [flatCategories, byId],
  );

  const brandsEnabled = activeSection === 'brands';
  const { data: brandsRows = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'brands', 'catalog'],
    () => adminApi.brands({ page_size: 500 }),
    { enabled: brandsEnabled },
  );

  const attrEnabled = activeSection === 'attributes';
  const { data: attributesRows = [] } = useAdminList<AttrRow>(
    ['admin', 'attributes', 'catalog'],
    () => adminApi.attributes({ page_size: 500 }),
    { enabled: attrEnabled },
  );
  const { data: attrValueRows = [] } = useAdminList<AttrValRow>(
    ['admin', 'attribute-values', 'catalog', selectedAttribute ?? ''],
    () => adminApi.attributeValues({ attribute: selectedAttribute!, page_size: 500 }),
    { enabled: attrEnabled && !!selectedAttribute },
  );
  const valuesForSelected = useMemo(
    () =>
      selectedAttribute
        ? attrValueRows.filter((v) => v.attribute_id === selectedAttribute)
        : [],
    [attrValueRows, selectedAttribute],
  );

  const unitsEnabled = activeSection === 'units';
  const { data: unitsRows = [] } = useAdminList<Record<string, unknown>>(
    ['admin', 'units', 'catalog'],
    () => adminApi.units({ page_size: 500 }),
    { enabled: unitsEnabled },
  );

  switch (activeSection) {
    case 'categories': return CategoriesView();
    case 'subcategories': return SubcategoriesView();
    case 'child-categories': return ChildCategoriesView();
    case 'brands': return BrandsView();
    case 'attributes': return AttributesView();
    case 'units': return UnitsView();
    default: return CategoriesView();
  }

  function CategoriesView() {
    const onSaveCategory = async () => {
      const fd = new FormData();
      appendIfDefined(fd, 'name', categoryForm.name);
      appendIfDefined(fd, 'slug', categoryForm.slug);
      appendIfDefined(fd, 'sort_order', categoryForm.sort_order);
      appendIfDefined(fd, 'seo_title', categoryForm.seo_title);
      appendIfDefined(fd, 'seo_description', categoryForm.seo_description);
      appendIfDefined(fd, 'status', categoryForm.status);
      if (categoryImage) fd.append('image', categoryImage);
      if (editItem?.id) {
        await updateCategory.mutateAsync({ id: editItem.id, payload: fd });
      } else {
        await createCategory.mutateAsync(fd);
      }
      setModalOpen(false);
      setEditItem(null);
      setCategoryImage(null);
      setSlugEdited(false);
    };
    return (
      <div className="p-4 lg:p-6">
        <AdminTable
          title="Categories"
          subtitle="Manage product categories and hierarchy"
          data={topCategories}
          columns={[
            { key: 'name', label: 'Category Name', render: (cat) => {
              const img = cat.image ? resolveMediaUrl(String(cat.image)) : '';
              return (
              <div className="flex items-center gap-2">
                {img ? (
                  <img src={img} alt="" className="w-9 h-9 rounded-full object-cover border bg-muted shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Layers className="w-4 h-4 text-primary" /></div>
                )}
                <span className="font-medium">{cat.name}</span>
              </div>
              );
            } },
            { key: 'slug', label: 'Slug' },
            { key: 'parent', label: 'Parent' },
            { key: 'products', label: 'Products', className: 'text-center' },
            { key: 'status', label: 'Status', render: (cat) => (
              <Badge variant={cat.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs", cat.status === 'active' && "bg-emerald-500")}>{cat.status}</Badge>
            )},
            { key: 'actions', label: '', render: (cat) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEditItem(cat);
                    setCategoryForm({
                      name: cat.name ?? '',
                      slug: cat.slug ?? '',
                      seo_title: cat.seoTitle ?? '',
                      seo_description: cat.seoDesc ?? '',
                      sort_order: cat.sortOrder ?? 0,
                      status: cat.status ?? 'active',
                      headerColor: '#e91e8e',
                      bodyColor: '#f5f5f5',
                    });
                    setSlugEdited(true);
                    setCategoryImage(null);
                    setModalOpen(true);
                  }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                  <DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View Products</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => { setEditItem(cat); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          ]}
          onAdd={() => { setEditItem(null); setCategoryForm({ name: '', slug: '', seo_title: '', seo_description: '', sort_order: 0, status: 'active', headerColor: '#e91e8e', bodyColor: '#f5f5f5' }); setSlugEdited(false); setCategoryImage(null); setModalOpen(true); }}
          addLabel="Add Category"
          onExport={() => {}}
          onFilter={() => {}}
          bulkActions={[{ id: 'activate', label: 'Activate' }, { id: 'deactivate', label: 'Deactivate' }, { id: 'delete', label: 'Delete' }]}
        />
        <CRUDModal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Category' : 'Add Category'} onSave={onSaveCategory}>
          <div className="space-y-4">
            <div><Label>Category Name</Label><Input placeholder="Enter category name" value={categoryForm.name || ''} onChange={(e) => {
              const name = e.target.value;
              setCategoryForm((prev: Record<string, any>) => ({ ...prev, name, slug: slugEdited ? prev.slug : slugifyText(name) }));
            }} /></div>
            <div><Label>Slug</Label><Input placeholder="category-slug" value={categoryForm.slug || ''} onChange={(e) => {
              setSlugEdited(true);
              setCategoryForm((prev: Record<string, any>) => ({ ...prev, slug: slugifyText(e.target.value) }));
            }} /></div>
            <div><Label>Category Image</Label><Input type="file" accept="image/*" onChange={(e) => setCategoryImage(e.target.files?.[0] ?? null)} /></div>
            <Card><CardContent className="p-4 space-y-4">
              <CardTitle className="text-sm">🎨 Theme Colors (Mobile Homepage)</CardTitle>
              <p className="text-xs text-muted-foreground">Set colors that apply dynamically on mobile homepage for this category.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Header Background Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="color" className="w-12 h-9 p-1 cursor-pointer" value={normalizeHexColor(categoryForm.headerColor || '#e91e8e') || '#e91e8e'} onChange={(e) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, headerColor: normalizeHexColor(e.target.value) }))} />
                    <Input placeholder="#E91E8E" className="flex-1" value={categoryForm.headerColor || ''} onChange={(e) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, headerColor: normalizeHexColor(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <Label>Body / Theme Color</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="color" className="w-12 h-9 p-1 cursor-pointer" value={normalizeHexColor(categoryForm.bodyColor || '#f5f5f5') || '#f5f5f5'} onChange={(e) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, bodyColor: normalizeHexColor(e.target.value) }))} />
                    <Input placeholder="#F5F5F5" className="flex-1" value={categoryForm.bodyColor || ''} onChange={(e) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, bodyColor: normalizeHexColor(e.target.value) }))} />
                  </div>
                </div>
              </div>
            </CardContent></Card>
            <div><Label>SEO Title</Label><Input placeholder="SEO meta title" value={categoryForm.seo_title || ''} onChange={(e) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, seo_title: e.target.value }))} /></div>
            <div><Label>SEO Description</Label><Input placeholder="SEO meta description" value={categoryForm.seo_description || ''} onChange={(e) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, seo_description: e.target.value }))} /></div>
            <div className="flex items-center justify-between"><Label>Active Status</Label><Switch checked={(categoryForm.status || 'active') === 'active'} onCheckedChange={(checked) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, status: checked ? 'active' : 'inactive' }))} /></div>
          </div>
        </CRUDModal>
        <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={async () => {
          if (editItem?.id) await deleteCategory.mutateAsync(editItem.id);
          setDeleteOpen(false);
          setEditItem(null);
        }} description="This will permanently delete this category and may affect associated products." />
      </div>
    );
  }

  function SubcategoriesView() {
    const onSaveSubcategory = async () => {
      if (!categoryForm.parent_id) return;
      const fd = new FormData();
      appendIfDefined(fd, 'name', categoryForm.name);
      appendIfDefined(fd, 'slug', categoryForm.slug);
      appendIfDefined(fd, 'parent_id', categoryForm.parent_id);
      appendIfDefined(fd, 'sort_order', categoryForm.sort_order);
      appendIfDefined(fd, 'status', categoryForm.status);
      if (categoryImage) fd.append('image', categoryImage);
      if (editItem?.id) {
        await updateCategory.mutateAsync({ id: editItem.id, payload: fd });
      } else {
        await createCategory.mutateAsync(fd);
      }
      setModalOpen(false);
      setEditItem(null);
      setCategoryImage(null);
      setSlugEdited(false);
    };
    return (
      <div className="p-4 lg:p-6">
        <AdminTable
          title="Sub Categories" subtitle="Linked to parent categories"
          data={subRows}
          columns={[
            { key: 'name', label: 'Subcategory', render: (s) => {
              const img = s.image ? resolveMediaUrl(String(s.image)) : '';
              return (
                <div className="flex items-center gap-2">
                  {img ? <img src={img} alt="" className="w-9 h-9 rounded-full object-cover border bg-muted" /> : null}
                  <span className="font-medium">{s.name}</span>
                </div>
              );
            } },
            { key: 'slug', label: 'Slug' },
            { key: 'parent', label: 'Parent Category' },
            { key: 'sortOrder', label: 'Sort Order', className: 'text-center' },
            { key: 'products', label: 'Products', className: 'text-center' },
            { key: 'status', label: 'Visibility', render: (s) => (
              <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs", s.status === 'active' && "bg-emerald-500")}>{s.status}</Badge>
            )},
            { key: 'actions', label: '', render: (s) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEditItem(s);
                    setCategoryForm({
                      name: s.name ?? '',
                      slug: s.slug ?? '',
                      parent_id: s.parentId ?? '',
                      parentLabel: s.parent && s.parent !== '-' ? String(s.parent) : '',
                      sort_order: s.sortOrder ?? 0,
                      status: s.status ?? 'active',
                      seo_title: '',
                      seo_description: '',
                      headerColor: '#e91e8e',
                      bodyColor: '#f5f5f5',
                    });
                    setSlugEdited(true);
                    setCategoryImage(null);
                    setModalOpen(true);
                  }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => { setEditItem(s); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          ]}
          onAdd={() => {
            setEditItem(null);
            setCategoryForm({
              name: '',
              slug: '',
              parent_id: '',
              parentLabel: '',
              sort_order: 0,
              status: 'active',
              seo_title: '',
              seo_description: '',
              headerColor: '#e91e8e',
              bodyColor: '#f5f5f5',
            });
            setSlugEdited(false);
            setCategoryImage(null);
            setModalOpen(true);
          }}
          addLabel="Add Subcategory"
          onFilter={() => {}}
        />
        <CRUDModal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Subcategory' : 'Add Subcategory'} onSave={onSaveSubcategory}>
          <div className="space-y-4">
            <div><Label>Subcategory Name</Label><Input placeholder="Enter name" value={categoryForm.name || ''} onChange={(e) => {
              const name = e.target.value;
              setCategoryForm((prev: Record<string, any>) => ({ ...prev, name, slug: slugEdited ? prev.slug : slugifyText(name) }));
            }} /></div>
            <div><Label>Slug</Label><Input placeholder="subcategory-slug" value={categoryForm.slug || ''} onChange={(e) => {
              setSlugEdited(true);
              setCategoryForm((prev: Record<string, any>) => ({ ...prev, slug: slugifyText(e.target.value) }));
            }} /></div>
            <div>
              <Label>Parent Category</Label>
              <AdminSearchCombobox
                queryKeyPrefix="catalog-sub-parent"
                value={categoryForm.parent_id || ''}
                selectedLabel={categoryForm.parentLabel}
                onChange={(v, l) =>
                  setCategoryForm((prev: Record<string, any>) => ({
                    ...prev,
                    parent_id: v,
                    parentLabel: l ?? '',
                  }))
                }
                fetchOptions={fetchTopCategoryAdminOptions}
                placeholder="Search top-level category…"
                clearable
              />
            </div>
            <div><Label>Sort Order</Label><Input type="number" placeholder="0" value={categoryForm.sort_order ?? 0} onChange={(e) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))} /></div>
            <div><Label>Image (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setCategoryImage(e.target.files?.[0] ?? null)} /></div>
            <div className="flex items-center justify-between"><Label>Visible</Label><Switch checked={(categoryForm.status || 'active') === 'active'} onCheckedChange={(checked) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, status: checked ? 'active' : 'inactive' }))} /></div>
          </div>
        </CRUDModal>
        <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={async () => {
          if (editItem?.id) await deleteCategory.mutateAsync(editItem.id);
          setDeleteOpen(false);
          setEditItem(null);
        }} />
      </div>
    );
  }

  function ChildCategoriesView() {
    const onSaveChildCategory = async () => {
      if (!categoryForm.parent_id) return;
      const fd = new FormData();
      appendIfDefined(fd, 'name', categoryForm.name);
      appendIfDefined(fd, 'slug', categoryForm.slug);
      appendIfDefined(fd, 'parent_id', categoryForm.parent_id);
      appendIfDefined(fd, 'sort_order', categoryForm.sort_order);
      appendIfDefined(fd, 'status', categoryForm.status);
      if (categoryImage) fd.append('image', categoryImage);
      if (editItem?.id) {
        await updateCategory.mutateAsync({ id: editItem.id, payload: fd });
      } else {
        await createCategory.mutateAsync(fd);
      }
      setModalOpen(false);
      setEditItem(null);
      setCategoryImage(null);
      setSlugEdited(false);
    };
    return (
      <div className="p-4 lg:p-6">
        <AdminTable
          title="Child Categories" subtitle="Deep-level categorization for filtering & navigation"
          data={childRows}
          columns={[
            { key: 'name', label: 'Child Category', render: (c) => {
              const img = c.image ? resolveMediaUrl(String(c.image)) : '';
              return (
                <div className="flex items-center gap-2">
                  {img ? <img src={img} alt="" className="w-9 h-9 rounded-full object-cover border bg-muted" /> : null}
                  <span className="font-medium">{c.name}</span>
                </div>
              );
            } },
            { key: 'parent', label: 'Subcategory' },
            { key: 'grandparent', label: 'Category' },
            { key: 'products', label: 'Products', className: 'text-center' },
            { key: 'status', label: 'Status', render: (c) => (
              <Badge variant={c.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs", c.status === 'active' && "bg-emerald-500")}>{c.status}</Badge>
            )},
            { key: 'actions', label: '', render: (c) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEditItem(c);
                    setCategoryForm({
                      name: c.name ?? '',
                      slug: c.slug ?? '',
                      parent_id: c.parentId ?? '',
                      parentLabel: c.parent && c.parent !== '-' ? String(c.parent) : '',
                      sort_order: c.sortOrder ?? 0,
                      status: c.status ?? 'active',
                      seo_title: '',
                      seo_description: '',
                      headerColor: '#e91e8e',
                      bodyColor: '#f5f5f5',
                    });
                    setSlugEdited(true);
                    setCategoryImage(null);
                    setModalOpen(true);
                  }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => { setEditItem(c); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          ]}
          onAdd={() => {
            setEditItem(null);
            setCategoryForm({
              name: '',
              slug: '',
              parent_id: '',
              parentLabel: '',
              sort_order: 0,
              status: 'active',
              seo_title: '',
              seo_description: '',
              headerColor: '#e91e8e',
              bodyColor: '#f5f5f5',
            });
            setSlugEdited(false);
            setCategoryImage(null);
            setModalOpen(true);
          }}
          addLabel="Add Child Category"
        />
        <CRUDModal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Child Category' : 'Add Child Category'} onSave={onSaveChildCategory}>
          <div className="space-y-4">
            <div><Label>Child Category Name</Label><Input placeholder="Enter name" value={categoryForm.name || ''} onChange={(e) => {
              const name = e.target.value;
              setCategoryForm((prev: Record<string, any>) => ({ ...prev, name, slug: slugEdited ? prev.slug : slugifyText(name) }));
            }} /></div>
            <div><Label>Slug</Label><Input placeholder="child-slug" value={categoryForm.slug || ''} onChange={(e) => {
              setSlugEdited(true);
              setCategoryForm((prev: Record<string, any>) => ({ ...prev, slug: slugifyText(e.target.value) }));
            }} /></div>
            <div>
              <Label>Parent Subcategory</Label>
              <AdminSearchCombobox
                queryKeyPrefix="catalog-child-parent"
                value={categoryForm.parent_id || ''}
                selectedLabel={categoryForm.parentLabel}
                onChange={(v, l) =>
                  setCategoryForm((prev: Record<string, any>) => ({
                    ...prev,
                    parent_id: v,
                    parentLabel: l ?? '',
                  }))
                }
                fetchOptions={fetchSubcategoryParentOptions}
                placeholder="Search subcategory…"
                clearable
              />
            </div>
            <div><Label>Sort Order</Label><Input type="number" value={categoryForm.sort_order ?? 0} onChange={(e) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))} /></div>
            <div><Label>Image (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setCategoryImage(e.target.files?.[0] ?? null)} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={(categoryForm.status || 'active') === 'active'} onCheckedChange={(checked) => setCategoryForm((prev: Record<string, any>) => ({ ...prev, status: checked ? 'active' : 'inactive' }))} /></div>
          </div>
        </CRUDModal>
        <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={async () => {
          if (editItem?.id) await deleteCategory.mutateAsync(editItem.id);
          setDeleteOpen(false);
          setEditItem(null);
        }} />
      </div>
    );
  }

  function BrandsView() {
    const onSaveBrand = async () => {
      const fd = new FormData();
      appendIfDefined(fd, 'name', brandForm.name);
      appendIfDefined(fd, 'status', brandForm.status);
      if (brandLogo) fd.append('logo', brandLogo);
      if (editItem?.id) {
        await updateBrand.mutateAsync({ id: editItem.id, payload: fd });
      } else {
        await createBrand.mutateAsync(fd);
      }
      setModalOpen(false);
      setEditItem(null);
      setBrandLogo(null);
    };
    return (
      <div className="p-4 lg:p-6">
        <AdminTable title="Brands" subtitle="Manage product brands"
          data={brandsRows}
          columns={[
            { key: 'name', label: 'Brand', render: (b) => {
              const logoSrc = resolveMediaUrl(String(b.logo ?? ''));
              return (
                <div className="flex items-center gap-2">
                  {logoSrc ? (
                    <img src={logoSrc} alt="" className="w-9 h-9 rounded-full object-cover bg-muted border" />
                  ) : (
                    <span className="text-xl w-9 h-9 flex items-center justify-center rounded bg-muted">📦</span>
                  )}
                  <span className="font-medium">{String(b.name)}</span>
                </div>
              );
            }},
            { key: 'products', label: 'Products', render: (b) => String(b.products ?? '—') },
            { key: 'status', label: 'Status', render: (b) => (
              <Badge variant={b.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs", b.status === 'active' && "bg-emerald-500")}>{String(b.status)}</Badge>
            )},
            { key: 'actions', label: '', render: (b) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditItem(b); setBrandForm({ name: String(b.name || ''), status: String(b.status || 'active') }); setBrandLogo(null); setModalOpen(true); }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => { setEditItem(b); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          ]}
          onAdd={() => { setEditItem(null); setBrandForm({ name: '', status: 'active' }); setBrandLogo(null); setModalOpen(true); }} addLabel="Add Brand"
        />
        <CRUDModal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Brand' : 'Add Brand'} onSave={onSaveBrand}>
          <div className="space-y-4">
            <div><Label>Brand Name</Label><Input placeholder="Enter brand name" value={brandForm.name || ''} onChange={(e) => setBrandForm((prev: Record<string, any>) => ({ ...prev, name: e.target.value }))} /></div>
            <div><Label>Logo</Label><Input type="file" accept="image/*" onChange={(e) => setBrandLogo(e.target.files?.[0] ?? null)} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={(brandForm.status || 'active') === 'active'} onCheckedChange={(checked) => setBrandForm((prev: Record<string, any>) => ({ ...prev, status: checked ? 'active' : 'inactive' }))} /></div>
          </div>
        </CRUDModal>
        <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={async () => {
          if (editItem?.id) await deleteBrand.mutateAsync(editItem.id);
          setDeleteOpen(false);
          setEditItem(null);
        }} />
      </div>
    );
  }

  function AttributesView() {
    const selectedAttrMeta = attributesRows.find((a) => a.id === selectedAttribute);
    const isColorAttribute = selectedAttrMeta?.type === 'color';

    const onSaveAttribute = async () => {
      if (!attrForm.name.trim()) return;
      const payload = { name: attrForm.name.trim(), type: attrForm.type, status: attrForm.status };
      if (editItem?.id) {
        await updateAttribute.mutateAsync({ id: editItem.id, payload });
      } else {
        await createAttribute.mutateAsync(payload);
      }
      setAttrDialog('closed');
      setEditItem(null);
    };

    const onSaveAttributeValue = async () => {
      if (!selectedAttribute) return;
      let val = valueForm.value.trim();
      if (!val) return;
      if (isColorAttribute) {
        const hex = normalizeHexColor(val);
        if (!hex) return;
        val = hex;
      }
      if (editValueRow?.id) {
        await updateAttributeValue.mutateAsync({
          id: editValueRow.id,
          payload: { value: val, sort_order: valueForm.sort_order, status: valueForm.status },
        });
      } else {
        await createAttributeValue.mutateAsync({
          attribute_id: selectedAttribute,
          value: val,
          sort_order: valueForm.sort_order,
          status: valueForm.status,
        });
      }
      setAttrDialog('closed');
      setEditValueRow(null);
    };

    const attrModalTitle =
      attrDialog === 'value'
        ? editValueRow
          ? 'Edit Attribute Value'
          : 'Add Attribute Value'
        : editItem
          ? 'Edit Attribute'
          : 'Add Attribute';

    const onAttrModalSave = () => {
      if (attrDialog === 'value') void onSaveAttributeValue();
      else if (attrDialog === 'attribute') void onSaveAttribute();
    };

    return (
      <div className="p-4 lg:p-6 space-y-6">
        <AdminTable title="Attributes" subtitle="Product attributes like color, size, material"
          data={attributesRows}
          columns={[
            { key: 'name', label: 'Attribute', render: (a) => (
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span className="font-medium">{a.name}</span>
              </div>
            )},
            { key: 'type', label: 'Type', render: (a) => <Badge variant="outline" className="text-xs capitalize">{a.type}</Badge> },
            { key: 'values', label: 'Values', className: 'text-center' },
            { key: 'status', label: 'Status', render: (a) => (
              <Badge variant={a.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs", a.status === 'active' && "bg-emerald-500")}>{a.status}</Badge>
            )},
            { key: 'actions', label: '', render: (a) => (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7" onClick={() => setSelectedAttribute(a.id)}>
                  <Eye className="w-3 h-3 mr-1" /> Values
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditItem(a);
                      setAttrForm({ name: a.name, type: a.type, status: a.status });
                      setAttrDialog('attribute');
                    }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => { setEditItem(a); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          ]}
          onAdd={() => {
            setEditItem(null);
            setAttrForm({ name: '', type: 'dropdown', status: 'active' });
            setAttrDialog('attribute');
          }} addLabel="Add Attribute"
        />

        {selectedAttribute && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Values for: {attributesRows.find(a => a.id === selectedAttribute)?.name}</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                   setEditValueRow(null);
                    setValueForm({ value: '', sort_order: 0, status: 'active' });
                    setAttrDialog('value');
                  }}><Plus className="w-3 h-3 mr-1" /> Add Value</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedAttribute(null)}>Close</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {valuesForSelected.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No values for this attribute yet.</p>
                ) : (
                  valuesForSelected.map((val) => (
                    <div key={val.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">#{val.sortOrder}</span>
                        <span className="font-medium text-sm flex items-center gap-2">
                          {isColorAttribute && (
                            <span className="inline-block w-5 h-5 rounded border" style={{ backgroundColor: val.value }} />
                          )}
                          {val.value}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={val.status === 'active' ? 'default' : 'secondary'} className={cn("text-[10px]", val.status === 'active' && "bg-emerald-500")}>{val.status}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditValueRow(val);
                          setValueForm({ value: val.value, sort_order: val.sortOrder, status: val.status });
                          setAttrDialog('value');
                        }}><Edit className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => {
                          setValueToDelete(val);
                          setValueDeleteOpen(true);
                        }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <CRUDModal
          open={attrDialog !== 'closed'}
          onClose={() => { setAttrDialog('closed'); setEditItem(null); setEditValueRow(null); }}
          title={attrModalTitle}
          onSave={onAttrModalSave}
        >
          {attrDialog === 'value' ? (
            <div className="space-y-4">
              {isColorAttribute ? (
                <>
                  <div><Label>Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input type="color" className="w-12 h-9 p-1 cursor-pointer" value={normalizeHexColor(valueForm.value || '#000000') || '#000000'} onChange={(e) => setValueForm((p) => ({ ...p, value: normalizeHexColor(e.target.value) }))} />
                      <Input placeholder="#RRGGBB" className="flex-1" value={valueForm.value} onChange={(e) => setValueForm((p) => ({ ...p, value: e.target.value }))} />
                    </div>
                  </div>
                  <div className="h-8 rounded border" style={{ backgroundColor: normalizeHexColor(valueForm.value) || 'transparent' }} />
                </>
              ) : (
                <div><Label>Value</Label><Input placeholder="e.g. Red, XL, Cotton" value={valueForm.value} onChange={(e) => setValueForm((p) => ({ ...p, value: e.target.value }))} /></div>
              )}
              <div><Label>Sort Order</Label><Input type="number" value={valueForm.sort_order} onChange={(e) => setValueForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))} /></div>
              <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={(valueForm.status || 'active') === 'active'} onCheckedChange={(checked) => setValueForm((p) => ({ ...p, status: checked ? 'active' : 'inactive' }))} /></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div><Label>Attribute Name</Label><Input placeholder="e.g. Color, Size" value={attrForm.name} onChange={(e) => setAttrForm((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Type</Label>
                <Select value={attrForm.type} onValueChange={(v) => setAttrForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="dropdown">Dropdown</SelectItem>
                    <SelectItem value="color">Color Picker</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={(attrForm.status || 'active') === 'active'} onCheckedChange={(checked) => setAttrForm((p) => ({ ...p, status: checked ? 'active' : 'inactive' }))} /></div>
            </div>
          )}
        </CRUDModal>
        <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={async () => {
          if (editItem?.id) await deleteAttribute.mutateAsync(editItem.id);
          setDeleteOpen(false);
          setEditItem(null);
        }} />
        <DeleteConfirm open={valueDeleteOpen} onClose={() => { setValueDeleteOpen(false); setValueToDelete(null); }} onConfirm={async () => {
          if (valueToDelete?.id) await deleteAttributeValue.mutateAsync(valueToDelete.id);
          setValueDeleteOpen(false);
          setValueToDelete(null);
        }} description="Delete this attribute value?" />
      </div>
    );
  }

  function UnitsView() {
    const onSaveUnit = async () => {
      if (!unitForm.name.trim() || !unitForm.short_name.trim()) return;
      const payload = {
        name: unitForm.name.trim(),
        short_name: unitForm.short_name.trim(),
        type: unitForm.type,
        conversion: unitForm.conversion,
        status: unitForm.status,
      };
      if (editItem?.id) {
        await updateUnit.mutateAsync({ id: editItem.id, payload });
      } else {
        await createUnit.mutateAsync(payload);
      }
      setModalOpen(false);
      setEditItem(null);
    };
    return (
      <div className="p-4 lg:p-6">
        <AdminTable title="Units" subtitle="Measurement units for products (kg, pcs, liter, month, license)"
          data={unitsRows}
          columns={[
            { key: 'name', label: 'Unit', render: (u) => (
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                <div><span className="font-medium">{String(u.name)}</span><span className="text-xs text-muted-foreground ml-2">({String(u.shortName ?? '')})</span></div>
              </div>
            )},
            { key: 'type', label: 'Type', render: (u) => <Badge variant="outline" className="text-xs capitalize">{String(u.type)}</Badge> },
            { key: 'conversion', label: 'Conversion', render: (u) => String(u.conversion ?? '—') },
            { key: 'status', label: 'Status', render: (u) => (
              <Badge variant={u.status === 'active' ? 'default' : 'secondary'} className={cn("text-xs", u.status === 'active' && "bg-emerald-500")}>{String(u.status)}</Badge>
            )},
            { key: 'actions', label: '', render: (u) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    setEditItem(u);
                    setUnitForm({
                      name: String(u.name ?? ''),
                      short_name: String(u.shortName ?? ''),
                      type: String(u.type ?? 'quantity'),
                      conversion: u.conversion === '—' ? '' : String(u.conversion ?? ''),
                      status: String(u.status ?? 'active'),
                    });
                    setModalOpen(true);
                  }}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => { setEditItem(u); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          ]}
          onAdd={() => {
            setEditItem(null);
            setUnitForm({ name: '', short_name: '', type: 'quantity', conversion: '', status: 'active' });
            setModalOpen(true);
          }} addLabel="Add Unit"
        />
        <CRUDModal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Unit' : 'Add Unit'} onSave={onSaveUnit}>
          <div className="space-y-4">
            <div><Label>Unit Name</Label><Input placeholder="e.g. Kilogram" value={unitForm.name} onChange={(e) => setUnitForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Short Name</Label><Input placeholder="e.g. kg" value={unitForm.short_name} onChange={(e) => setUnitForm((p) => ({ ...p, short_name: e.target.value }))} /></div>
            <div><Label>Type</Label>
              <Select value={unitForm.type} onValueChange={(v) => setUnitForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight</SelectItem>
                  <SelectItem value="volume">Volume</SelectItem>
                  <SelectItem value="length">Length</SelectItem>
                  <SelectItem value="quantity">Quantity</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Conversion Note</Label><Input placeholder="e.g. 1 kg = 1000 g" value={unitForm.conversion} onChange={(e) => setUnitForm((p) => ({ ...p, conversion: e.target.value }))} /></div>
            <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={(unitForm.status || 'active') === 'active'} onCheckedChange={(checked) => setUnitForm((p) => ({ ...p, status: checked ? 'active' : 'inactive' }))} /></div>
          </div>
        </CRUDModal>
        <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={async () => {
          if (editItem?.id) await deleteUnit.mutateAsync(editItem.id);
          setDeleteOpen(false);
          setEditItem(null);
        }} />
      </div>
    );
  }
}
