import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminProductDetail } from '@/lib/api';
import { useAdminList } from '../hooks/useAdminList';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { useAdminCrudPolicy } from '../hooks/useAdminCrudPolicy';
import {
  Package, Building2, Star, Edit, Trash2, MoreVertical, Eye, Plus, CheckCircle, XCircle
} from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal, DeleteConfirm } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAdminRouteContext } from '../adminRouteContext';
import { formatApiError, slugifyText, appendIfDefined, resolveMediaUrl } from '../hooks/adminFormUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import {
  fetchCategoryAdminOptions,
  fetchBrandAdminOptions,
  fetchUnitAdminOptions,
  fetchVendorAdminOptions,
} from '@/components/admin/adminRelationalPickers';

type AdminProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  seller: string;
  type: string;
  brand: string;
  featured: boolean;
  image_url?: string;
};

function mapProductDetailToForm(d: AdminProductDetail) {
  return {
    name: d.name,
    slug: d.slug,
    sku: d.sku,
    price: String(d.price),
    discountPrice: d.discount_price != null ? String(d.discount_price) : '',
    stock: String(d.stock),
    type: d.type,
    status: d.status,
    shortDescription: d.short_description,
    description: d.description,
    seoTitle: d.seo_title,
    seoDescription: d.seo_description,
    seoKeywords: d.seo_keywords,
    categoryId: d.category_id,
    categoryLabel: d.category_name,
    brandId: d.brand_id,
    brandLabel: d.brand_name,
    unitId: d.unit_id,
    unitLabel: d.unit_name,
    taxPercent: String(d.tax_percent),
    hasVariations: d.has_variations,
    featured: d.is_featured,
    enableReels: d.enable_reels,
    enablePos: d.enable_pos,
    sellerId: d.seller_id || '',
    sellerLabel: d.seller_name || '',
    existingImageUrl: d.image_url,
  };
}
type ReviewRow = {
  id: string;
  product: string;
  customer: string;
  rating: number;
  comment: string;
  date: string;
  replied: boolean;
  status: string;
};
type ApprovalRow = {
  id: string;
  product: string;
  product_id?: string;
  sku?: string;
  image_url?: string;
  vendor: string;
  type: string;
  status: string;
  submitted: string;
  category: string;
  price: number;
  rejection_reason?: string;
};

interface ProductsModuleProps {
  activeSection: string;
}

export default function ProductsModule({ activeSection }: ProductsModuleProps) {
  switch (activeSection) {
    case 'inhouse': return <ProductsList filterInHouse />;
    case 'product-approvals': return <ApprovalsView />;
    case 'reviews': return <ReviewsView />;
    default: return <ProductsList />;
  }
}

function ProductsList({ filterInHouse }: { filterInHouse?: boolean }) {
  const adminRoute = useAdminRouteContext();
  const crud = useAdminCrudPolicy();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductRow | null>(null);
  const routeAdd = adminRoute?.action === 'add';
  const routeEdit = adminRoute?.action === 'edit';
  const routeView = adminRoute?.action === 'view';
  const resolvedModalOpen = modalOpen || routeAdd || routeEdit;
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const createMutation = useAdminMutation(adminApi.createProduct, [['admin', 'products']]);
  const updateMutation = useAdminMutation(
    ({ id, payload }: { id: string; payload: FormData }) => adminApi.updateProduct(id, payload),
    [['admin', 'products']],
  );
  const deleteMutation = useAdminMutation(adminApi.deleteProduct, [['admin', 'products']]);

  const { data: rawProducts = [], isLoading, isError } = useAdminList<AdminProductRow>(
    ['admin', 'products', filterInHouse ? 'inhouse' : 'all'],
    () => adminApi.products({ page_size: 200 }),
  );

  const data = useMemo(
    () => (filterInHouse ? rawProducts.filter((p) => p.seller === 'In-House') : rawProducts),
    [rawProducts, filterInHouse],
  );

  const detailId = adminRoute?.itemId;
  const { data: productDetail } = useQuery({
    queryKey: ['admin', 'product', detailId],
    queryFn: () => adminApi.productDetail(detailId!),
    enabled: Boolean(detailId && (routeEdit || routeView)),
  });

  useEffect(() => {
    if (!productDetail || !routeEdit) return;
    setFormData(mapProductDetailToForm(productDetail));
    setSlugEdited(true);
    setPrimaryImage(null);
    setFormErrors({});
  }, [productDetail, routeEdit]);

  const updateField = (key: string, value: any) => {
    setFormData(prev => {
      if (key === 'name') {
        return { ...prev, [key]: value, slug: slugEdited ? prev.slug : slugifyText(value) };
      }
      return { ...prev, [key]: value };
    });
    if (formErrors[key]) setFormErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading products…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load products.</div>;

  return (
    <div className="p-4 lg:p-6">
      <AdminTable
        title={filterInHouse ? 'In-House Products' : 'All Products'}
        subtitle="Manage your product inventory"
        data={data}
        columns={[
          { key: 'name', label: 'Product', render: (p) => {
            const img = p.image_url ? resolveMediaUrl(p.image_url) : '';
            return (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <Package className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">SKU: {p.sku} • {p.type === 'digital' ? '🔵 Digital' : '📦 Physical'}</p>
              </div>
            </div>
            );
          } },
          { key: 'category', label: 'Category' },
          { key: 'brand', label: 'Brand' },
          { key: 'price', label: 'Price', render: (p) => <span className="font-medium">Rs. {p.price.toLocaleString()}</span> },
          { key: 'stock', label: 'Stock', render: (p) => (
            <Badge variant={p.stock === 0 ? 'destructive' : p.stock < 20 ? 'secondary' : 'outline'} className="text-xs">
              {p.type === 'digital' ? '∞' : `${p.stock} units`}
            </Badge>
          )},
          { key: 'seller', label: 'Seller', render: (p) => (
            <Badge variant={p.seller === 'In-House' ? 'default' : 'outline'} className="text-xs">{p.seller}</Badge>
          )},
          { key: 'featured', label: 'Featured', render: (p) => p.featured ? <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> : <span className="text-muted-foreground">-</span> },
          { key: 'status', label: 'Status', render: (p) => (
            <Badge variant={p.status === 'active' ? 'default' : 'destructive'} className={cn("text-xs", p.status === 'active' && "bg-emerald-500")}>{p.status}</Badge>
          )},
          { key: 'actions', label: '', render: (p) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => adminRoute?.navigateToView(p.id)}><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                {crud.canProductMutate ? (
                  <DropdownMenuItem onClick={() => adminRoute?.navigateToEdit(p.id) ?? setModalOpen(true)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                ) : null}
                {crud.canProductDelete ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onAdd={crud.canProductMutate ? () => adminRoute?.navigateToAdd() ?? setModalOpen(true) : undefined} addLabel="Add Product" onExport={() => {}} onFilter={() => {}}
        bulkActions={[{ id: 'activate', label: 'Activate' }, { id: 'deactivate', label: 'Deactivate' }, { id: 'delete', label: 'Delete' }]}
      />

      <CRUDModal
        open={routeView && Boolean(detailId)}
        onClose={() => { adminRoute?.navigateToList(); }}
        title="Product details"
        size="xl"
        onSave={() => { adminRoute?.navigateToList(); }}
        saveLabel="Close"
      >
        {!productDetail && detailId ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : productDetail ? (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex gap-4">
              {productDetail.image_url ? (
                <img src={resolveMediaUrl(productDetail.image_url)} alt="" className="w-32 h-32 rounded-lg object-cover border" />
              ) : null}
              <div className="space-y-1 text-sm">
                <p className="text-lg font-semibold">{productDetail.name}</p>
                <p className="text-muted-foreground">SKU: {productDetail.sku} · {productDetail.type}</p>
                <Badge className={cn(productDetail.status === 'active' && 'bg-emerald-500')}>{productDetail.status}</Badge>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Category</span><p className="font-medium">{productDetail.category_name}</p></div>
              <div><span className="text-muted-foreground">Brand</span><p className="font-medium">{productDetail.brand_name || '—'}</p></div>
              <div><span className="text-muted-foreground">Unit</span><p className="font-medium">{productDetail.unit_name || '—'}</p></div>
              <div><span className="text-muted-foreground">Seller</span><p className="font-medium">{productDetail.seller_name || 'In-House'}</p></div>
              <div><span className="text-muted-foreground">Price</span><p className="font-medium">Rs. {productDetail.price.toLocaleString()}</p></div>
              {productDetail.discount_price != null ? (
                <div><span className="text-muted-foreground">Discount price</span><p className="font-medium">Rs. {productDetail.discount_price.toLocaleString()}</p></div>
              ) : null}
              <div><span className="text-muted-foreground">Stock</span><p className="font-medium">{productDetail.stock}</p></div>
              <div><span className="text-muted-foreground">Tax %</span><p className="font-medium">{productDetail.tax_percent}</p></div>
            </div>
            {productDetail.short_description ? (
              <div><p className="text-xs text-muted-foreground">Short description</p><p className="text-sm">{productDetail.short_description}</p></div>
            ) : null}
            {productDetail.description ? (
              <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm whitespace-pre-wrap">{productDetail.description}</p></div>
            ) : null}
            <div className="flex flex-wrap gap-2 text-xs">
              {productDetail.is_featured ? <Badge>Featured</Badge> : null}
              {productDetail.has_variations ? <Badge variant="outline">Variations</Badge> : null}
              {productDetail.enable_reels ? <Badge variant="outline">Reels</Badge> : null}
              {productDetail.enable_pos ? <Badge variant="outline">POS</Badge> : null}
            </div>
            <div className="border-t pt-3 space-y-1 text-xs text-muted-foreground">
              <p>SEO title: {productDetail.seo_title || '—'}</p>
              <p>SEO description: {productDetail.seo_description || '—'}</p>
              <p>Keywords: {productDetail.seo_keywords || '—'}</p>
            </div>
          </div>
        ) : null}
      </CRUDModal>

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteOpen(false);
            setDeleteTarget(null);
          } catch {
            setDeleteOpen(false);
          }
        }}
        description="This will permanently delete the product."
      />

      <CRUDModal open={resolvedModalOpen} onClose={() => { adminRoute?.navigateToList(); setModalOpen(false); setFormData({}); setFormErrors({}); setPrimaryImage(null); setSlugEdited(false); }} title={routeEdit ? 'Edit Product' : routeAdd ? 'Add Product' : 'Add / Edit Product'} size="xl" onSave={async () => {
        // Validate required fields
        const errors: Record<string, string> = {};
        if (!formData.name?.trim()) errors.name = 'Product name is required';
        if (!formData.price || Number(formData.price) <= 0) errors.price = 'Valid price is required';
        if (!formData.sku?.trim()) errors.sku = 'SKU is required';
        if (!routeEdit && !primaryImage) errors.image = 'Primary image is required';
        if (routeEdit && !primaryImage && !formData.existingImageUrl) errors.image = 'Product image is missing; upload a new image';
        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          return;
        }
        const fd = new FormData();
        appendIfDefined(fd, 'name', formData.name);
        appendIfDefined(fd, 'slug', formData.slug);
        appendIfDefined(fd, 'sku', formData.sku);
        appendIfDefined(fd, 'price', formData.price);
        appendIfDefined(fd, 'discount_price', formData.discountPrice);
        appendIfDefined(fd, 'stock', formData.stock);
        appendIfDefined(fd, 'type', formData.type || 'physical');
        appendIfDefined(fd, 'status', formData.status || 'active');
        appendIfDefined(fd, 'short_description', formData.shortDescription);
        appendIfDefined(fd, 'description', formData.description);
        appendIfDefined(fd, 'seo_title', formData.seoTitle);
        appendIfDefined(fd, 'seo_description', formData.seoDescription);
        appendIfDefined(fd, 'seo_keywords', formData.seoKeywords);
        appendIfDefined(fd, 'category_id', formData.categoryId);
        appendIfDefined(fd, 'brand_id', formData.brandId);
        appendIfDefined(fd, 'unit_id', formData.unitId);
        appendIfDefined(fd, 'tax_percent', formData.taxPercent || 13);
        appendIfDefined(fd, 'has_variations', formData.hasVariations ? 'true' : 'false');
        appendIfDefined(fd, 'is_featured', formData.featured ? 'true' : 'false');
        appendIfDefined(fd, 'enable_reels', formData.enableReels ? 'true' : 'false');
        appendIfDefined(fd, 'enable_pos', formData.enablePos ? 'true' : 'false');
        if (routeEdit) {
          fd.append('seller_id', formData.sellerId ? String(formData.sellerId) : '');
        } else if (formData.sellerId) {
          fd.append('seller_id', String(formData.sellerId));
        }
        if (primaryImage) fd.append('image', primaryImage);
        if (routeEdit && adminRoute?.itemId) {
          await updateMutation.mutateAsync({ id: adminRoute.itemId, payload: fd });
        } else {
          await createMutation.mutateAsync(fd);
        }
        adminRoute?.navigateToList();
        setModalOpen(false);
        setFormData({});
        setFormErrors({});
        setPrimaryImage(null);
        setSlugEdited(false);
      }}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="vendor">Vendor Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div>
              <Label>Seller (leave empty for In-House)</Label>
              <AdminSearchCombobox
                queryKeyPrefix="product-vendor"
                value={formData.sellerId || ''}
                selectedLabel={formData.sellerLabel}
                onChange={(v, l) => {
                  setFormData((prev) => ({
                    ...prev,
                    sellerId: v,
                    sellerLabel: l ?? '',
                  }));
                }}
                fetchOptions={fetchVendorAdminOptions}
                placeholder="Search vendor…"
                clearable
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Product Name <span className="text-destructive">*</span></Label>
                <Input placeholder="Enter product name" value={formData.name || ''} onChange={e => updateField('name', e.target.value)} className={formErrors.name ? 'border-destructive' : ''} />
                {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
              </div>
              <div className="md:col-span-2">
                <Label>Slug</Label>
                <Input placeholder="product-slug" value={formData.slug || ''} onChange={e => { setSlugEdited(true); updateField('slug', slugifyText(e.target.value)); }} />
              </div>
              <div><Label>Product Type</Label>
                <Select value={formData.type || 'physical'} onValueChange={(v) => updateField('type', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="physical">Physical</SelectItem><SelectItem value="digital">Digital</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <AdminSearchCombobox
                  queryKeyPrefix="product-category"
                  value={formData.categoryId || ''}
                  selectedLabel={formData.categoryLabel}
                  onChange={(v, l) => {
                    setFormData((prev) => ({
                      ...prev,
                      categoryId: v,
                      categoryLabel: l ?? '',
                    }));
                  }}
                  fetchOptions={fetchCategoryAdminOptions}
                  placeholder="Search category…"
                  clearable
                />
              </div>
              <div>
                <Label>Brand</Label>
                <AdminSearchCombobox
                  queryKeyPrefix="product-brand"
                  value={formData.brandId || ''}
                  selectedLabel={formData.brandLabel}
                  onChange={(v, l) => {
                    setFormData((prev) => ({
                      ...prev,
                      brandId: v,
                      brandLabel: l ?? '',
                    }));
                  }}
                  fetchOptions={fetchBrandAdminOptions}
                  placeholder="Search brand…"
                  clearable
                />
              </div>
              <div>
                <Label>Unit</Label>
                <AdminSearchCombobox
                  queryKeyPrefix="product-unit"
                  value={formData.unitId || ''}
                  selectedLabel={formData.unitLabel}
                  onChange={(v, l) => {
                    setFormData((prev) => ({
                      ...prev,
                      unitId: v,
                      unitLabel: l ?? '',
                    }));
                  }}
                  fetchOptions={fetchUnitAdminOptions}
                  placeholder="Search unit…"
                  clearable
                />
              </div>
            </div>
            <div><Label>Short Description</Label><Input placeholder="Brief product summary" value={formData.shortDescription || ''} onChange={(e) => updateField('shortDescription', e.target.value)} /></div>
            <div><Label>Full Description</Label><Textarea rows={5} placeholder="Detailed product description..." value={formData.description || ''} onChange={(e) => updateField('description', e.target.value)} /></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Label>Has Variations</Label><Switch checked={!!formData.hasVariations} onCheckedChange={(v) => updateField('hasVariations', v)} /></div>
              <div className="flex items-center gap-2"><Label>Featured</Label><Switch checked={!!formData.featured} onCheckedChange={(v) => updateField('featured', v)} /></div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Regular Price (Rs.) <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="0" value={formData.price || ''} onChange={e => updateField('price', e.target.value)} className={formErrors.price ? 'border-destructive' : ''} />
                {formErrors.price && <p className="text-xs text-destructive mt-1">{formErrors.price}</p>}
              </div>
              <div><Label>Discount Price (Rs.)</Label><Input type="number" placeholder="0" value={formData.discountPrice || ''} onChange={e => updateField('discountPrice', e.target.value)} /></div>
              <div>
                <Label>SKU (unique) <span className="text-destructive">*</span></Label>
                <Input placeholder="PROD-001" value={formData.sku || ''} onChange={e => updateField('sku', e.target.value)} className={formErrors.sku ? 'border-destructive' : ''} />
                {formErrors.sku && <p className="text-xs text-destructive mt-1">{formErrors.sku}</p>}
              </div>
              <div><Label>Stock Quantity</Label><Input type="number" placeholder="0" value={formData.stock || ''} onChange={e => updateField('stock', e.target.value)} /></div>
            </div>
            <div><Label>Tax (%)</Label><Input type="number" placeholder="13" value={formData.taxPercent || '13'} onChange={(e) => updateField('taxPercent', e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={formData.status || 'active'} onValueChange={(v) => updateField('status', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            {formData.existingImageUrl && !primaryImage ? (
              <div className="flex items-center gap-3">
                <img src={resolveMediaUrl(formData.existingImageUrl)} alt="" className="h-24 w-24 rounded-lg object-cover border" />
                <p className="text-xs text-muted-foreground">Current image. Choose a file below to replace.</p>
              </div>
            ) : null}
            <div><Label>Primary Thumbnail</Label><Input type="file" accept="image/*" onChange={(e) => setPrimaryImage(e.target.files?.[0] ?? null)} /></div>
            {formErrors.image && <p className="text-xs text-destructive mt-1">{formErrors.image}</p>}
            <div><Label>Gallery Images (comma-separated URLs)</Label><Textarea rows={3} placeholder="image1.jpg, image2.jpg, ..." disabled /></div>
            <p className="text-xs text-muted-foreground">Images will be stored in public storage. Max 5 gallery images recommended.</p>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <div><Label>SEO Title</Label><Input placeholder="Page title for search engines" value={formData.seoTitle || ''} onChange={(e) => updateField('seoTitle', e.target.value)} /></div>
            <div><Label>Meta Description</Label><Textarea rows={2} placeholder="Description for search results" value={formData.seoDescription || ''} onChange={(e) => updateField('seoDescription', e.target.value)} /></div>
            <div><Label>Meta Keywords</Label><Input placeholder="keyword1, keyword2, ..." value={formData.seoKeywords || ''} onChange={(e) => updateField('seoKeywords', e.target.value)} /></div>
          </TabsContent>

          <TabsContent value="vendor" className="space-y-4">
            <Card><CardContent className="p-4 space-y-4">
              <CardTitle className="text-sm">Vendor Feature Access</CardTitle>
              <p className="text-xs text-muted-foreground">Control which features are enabled when this product is managed by a vendor.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium text-sm">Enable Reels Upload</span>
                    <p className="text-xs text-muted-foreground">Allow vendor to create reels for this product</p>
                  </div>
                  <Switch checked={!!formData.enableReels} onCheckedChange={(v) => updateField('enableReels', v)} />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium text-sm">Enable POS</span>
                    <p className="text-xs text-muted-foreground">Allow this product in POS system</p>
                  </div>
                  <Switch checked={!!formData.enablePos} onCheckedChange={(v) => updateField('enablePos', v)} />
                </div>
              </div>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </CRUDModal>
    </div>
  );
}

function ApprovalsView() {
  const adminRoute = useAdminRouteContext();
  const [selected, setSelected] = useState<ApprovalRow | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [confirmApprove, setConfirmApprove] = useState<ApprovalRow | null>(null);
  const [confirmDeny, setConfirmDeny] = useState<ApprovalRow | null>(null);
  const [denyDialogReason, setDenyDialogReason] = useState('');
  const routeView = adminRoute?.action === 'view';
  const { data: rawApprovals = [], isLoading, isError } = useAdminList<{
    id: string;
    product: string;
    product_id?: string;
    sku?: string;
    image_url?: string;
    vendor: string;
    type: string;
    status: string;
    submitted: string;
    category: string;
    price: number;
    rejection_reason?: string;
  }>(['admin', 'product-approvals', 'pending'], () =>
    adminApi.productApprovals({ status: 'pending', page_size: 200 }),
  );

  const { data: approvalCounts } = useQuery({
    queryKey: ['admin', 'product-approvals', 'counts'],
    queryFn: async () => {
      const [p, a, d] = await Promise.all([
        adminApi.productApprovals({ status: 'pending', page_size: 1 }),
        adminApi.productApprovals({ status: 'approved', page_size: 1 }),
        adminApi.productApprovals({ status: 'denied', page_size: 1 }),
      ]);
      return { pending: p.count, approved: a.count, denied: d.count };
    },
  });

  const productApprovals: ApprovalRow[] = rawApprovals.map((a) => ({
    ...a,
    category: a.category ?? '—',
    price: typeof a.price === 'number' ? a.price : Number(a.price) || 0,
  }));
  const selectedByRoute = routeView ? productApprovals.find((p) => p.id === adminRoute?.itemId) ?? null : null;
  const resolvedSelected = selectedByRoute ?? selected;
  const resolvedViewOpen = viewOpen || routeView;
  const approvalMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      adminApi.updateProductApproval(id, payload),
    [['admin', 'product-approvals', 'pending'], ['admin', 'product-approvals', 'counts']],
  );

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading approvals…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load product approvals.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{approvalCounts?.pending ?? productApprovals.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending Approvals</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{approvalCounts?.approved ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Approved</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{approvalCounts?.denied ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Denied</p>
        </CardContent></Card>
      </div>

      <AdminTable title="Product Approvals" subtitle="Review vendor product submissions — approve or deny with reason"
        data={productApprovals}
        columns={[
          { key: 'product', label: 'Product', render: (p) => (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {p.image_url ? (
                  <img src={resolveMediaUrl(p.image_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{p.product}</p>
                <Badge variant="outline" className="text-[10px] mt-0.5">{p.type === 'new' ? 'New' : 'Update'}</Badge>
              </div>
            </div>
          )},
          { key: 'vendor', label: 'Vendor', render: (p) => <span className="font-medium">{p.vendor}</span> },
          { key: 'category', label: 'Category' },
          { key: 'price', label: 'Price', render: (p) => <span className="font-medium">Rs. {p.price.toLocaleString()}</span> },
          { key: 'submitted', label: 'Submitted' },
          { key: 'status', label: 'Status', render: (p) => (
            <Badge variant={p.status === 'approved' ? 'default' : p.status === 'denied' ? 'destructive' : 'secondary'}
              className={cn("text-xs", p.status === 'approved' && "bg-emerald-500")}>{p.status}</Badge>
          )},
          { key: 'actions', label: '', render: (p) => (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7" onClick={() => { adminRoute?.navigateToView(p.id) ?? (setSelected(p), setViewOpen(true)); }}>
                <Eye className="w-3 h-3 mr-1" /> View
              </Button>
              {p.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-emerald-600"
                    disabled={approvalMut.isPending}
                    onClick={() => { setActionError(''); setConfirmApprove(p); }}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-destructive"
                    disabled={approvalMut.isPending}
                    onClick={() => {
                      setActionError('');
                      setDenyDialogReason('');
                      setConfirmDeny(p);
                    }}
                  >
                    <XCircle className="w-3 h-3 mr-1" /> Deny
                  </Button>
                </>
              )}
            </div>
          )}
        ]}
        onFilter={() => {}}
      />

      <CRUDModal
        open={resolvedViewOpen}
        onClose={() => {
          adminRoute?.navigateToList();
          setViewOpen(false);
          setRejectReason('');
          setActionError('');
        }}
        title="Product Review Request"
        onSave={() => {
          adminRoute?.navigateToList();
          setViewOpen(false);
          setRejectReason('');
          setActionError('');
        }}
        saveLabel="Close"
        error={actionError}
      >
        {resolvedSelected && (
          <div className="space-y-4">
            {resolvedSelected.image_url ? (
              <div className="rounded-lg overflow-hidden border max-h-48 bg-muted">
                <img src={resolveMediaUrl(resolvedSelected.image_url)} alt="" className="w-full max-h-48 object-contain" />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Product</p><p className="font-semibold">{resolvedSelected.product}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">SKU</p><p className="font-semibold">{resolvedSelected.sku ?? '—'}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Vendor</p><p className="font-semibold">{resolvedSelected.vendor}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Category</p><p className="font-semibold">{resolvedSelected.category}</p></div>
              <div className="p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">Price</p><p className="font-semibold">Rs. {resolvedSelected.price.toLocaleString()}</p></div>
            </div>
            {resolvedSelected.rejection_reason ? (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <p className="text-xs font-medium text-destructive">Rejection reason</p>
                <p className="text-sm mt-1">{resolvedSelected.rejection_reason}</p>
              </div>
            ) : null}
            {resolvedSelected.status === 'pending' && (
              <div className="space-y-2">
                <Label>Rejection Reason (if denying)</Label>
                <Textarea
                  placeholder="Optional: explain why this product was denied..."
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={approvalMut.isPending}
                    onClick={() => { setActionError(''); setConfirmApprove(resolvedSelected); }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={approvalMut.isPending}
                    onClick={() => {
                      setActionError('');
                      setDenyDialogReason(rejectReason);
                      setConfirmDeny(resolvedSelected);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Deny
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CRUDModal>

      <AlertDialog open={!!confirmApprove} onOpenChange={(o) => !o && setConfirmApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve product?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmApprove ? `"${confirmApprove.product}" from ${confirmApprove.vendor} will go live.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (!confirmApprove) return;
                try {
                  await approvalMut.mutateAsync({ id: confirmApprove.id, payload: { status: 'approved' } });
                  setConfirmApprove(null);
                  adminRoute?.navigateToList();
                  setViewOpen(false);
                } catch (e) {
                  setActionError(formatApiError(e));
                  setConfirmApprove(null);
                }
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeny} onOpenChange={(o) => !o && setConfirmDeny(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this product?</AlertDialogTitle>
            <AlertDialogDescription>
              The vendor will be notified with the reason below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Reason</Label>
            <Textarea
              className="mt-1"
              rows={3}
              value={denyDialogReason}
              onChange={(e) => setDenyDialogReason(e.target.value)}
              placeholder="Explain why this submission is rejected..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (!confirmDeny) return;
                try {
                  await approvalMut.mutateAsync({
                    id: confirmDeny.id,
                    payload: { status: 'denied', rejection_reason: denyDialogReason },
                  });
                  setConfirmDeny(null);
                  adminRoute?.navigateToList();
                  setViewOpen(false);
                  setRejectReason('');
                } catch (e) {
                  setActionError(formatApiError(e));
                  setConfirmDeny(null);
                }
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReviewsView() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null);
  const [actionErr, setActionErr] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const listParams = useMemo(() => {
    const p: Record<string, string | number> = { page_size: 200 };
    if (statusFilter !== 'all') p.status = statusFilter;
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [statusFilter, debouncedSearch]);

  const { data: reviews = [], isLoading, isError } = useAdminList<ReviewRow>(
    ['admin', 'reviews', statusFilter, debouncedSearch],
    () => adminApi.reviews(listParams),
  );

  const updateMut = useAdminMutation(
    ({ id, payload }: { id: string; payload: Record<string, unknown> }) => adminApi.updateReview(id, payload),
    [['admin', 'reviews']],
  );
  const deleteMut = useAdminMutation(adminApi.deleteReview, [['admin', 'reviews']]);

  if (isLoading) return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading reviews…</div>;
  if (isError) return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load reviews.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {actionErr ? <p className="text-sm text-destructive">{actionErr}</p> : null}
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="h-9 max-w-xs text-sm"
          placeholder="Search product, customer, comment…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <AdminTable title="Product Reviews" subtitle="Moderate customer reviews — approve, reject, or delete"
        data={reviews}
        columns={[
          { key: 'product', label: 'Product', render: (r) => <span className="font-medium">{r.product}</span> },
          { key: 'customer', label: 'Customer' },
          { key: 'rating', label: 'Rating', render: (r) => (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("w-3.5 h-3.5", i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted")} />
              ))}
            </div>
          )},
          { key: 'comment', label: 'Comment', className: 'max-w-xs truncate' },
          { key: 'status', label: 'Status', render: (r) => (
            <Badge variant={r.status === 'approved' ? 'default' : r.status === 'reported' ? 'destructive' : 'secondary'}
              className={cn("text-xs", r.status === 'approved' && "bg-emerald-500")}>{r.status}</Badge>
          )},
          { key: 'actions', label: '', render: (r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {r.status === 'pending' && (
                  <DropdownMenuItem
                    className="text-emerald-600"
                    onClick={async () => {
                      setActionErr('');
                      try {
                        await updateMut.mutateAsync({ id: r.id, payload: { status: 'approved' } });
                      } catch (e) {
                        setActionErr(formatApiError(e));
                      }
                    }}
                  >
                    Approve
                  </DropdownMenuItem>
                )}
                {r.status === 'pending' && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={async () => {
                      setActionErr('');
                      try {
                        await updateMut.mutateAsync({ id: r.id, payload: { status: 'rejected' } });
                      } catch (e) {
                        setActionErr(formatApiError(e));
                      }
                    }}
                  >
                    Reject
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => { setActionErr(''); setDeleteTarget(r); }}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        ]}
        onFilter={() => {}} onExport={() => {}}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Product rating aggregates will be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteMut.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                } catch (e) {
                  setActionErr(formatApiError(e));
                  setDeleteTarget(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
