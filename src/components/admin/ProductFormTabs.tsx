import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminSearchCombobox } from '@/components/admin/AdminSearchCombobox';
import {
  fetchCategoryAdminOptions,
  fetchBrandAdminOptions,
  fetchUnitAdminOptions,
  fetchVendorAdminOptions,
} from '@/components/admin/adminRelationalPickers';
import {
  fetchCategoryVendorOptions,
  fetchBrandVendorOptions,
  fetchUnitVendorOptions,
} from '@/components/admin/vendorRelationalPickers';
import { resolveMediaUrl, slugifyText } from '@/pages/admin/hooks/adminFormUtils';
import { computeEffectiveSalePrice, MAX_PRODUCT_GALLERY } from '@/components/admin/productFormUtils';
import { X } from 'lucide-react';

export type ProductFormTabsVariant = 'admin' | 'vendor';

export type ProductFormTabsProps = {
  variant: ProductFormTabsVariant;
  formData: Record<string, unknown>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  formErrors: Record<string, string>;
  updateField: (key: string, value: unknown) => void;
  slugEdited: boolean;
  setSlugEdited: (v: boolean) => void;
  primaryImage: File | null;
  setPrimaryImage: (f: File | null) => void;
  existingGallery: { id: string; image_url: string; sort_order: number }[];
  galleryFiles: File[];
  setGalleryFiles: React.Dispatch<React.SetStateAction<File[]>>;
  removedGalleryIds: string[];
  setRemovedGalleryIds: React.Dispatch<React.SetStateAction<string[]>>;
  galleryPreviews: string[];
};

export function ProductFormTabs({
  variant,
  formData,
  setFormData,
  formErrors,
  updateField,
  slugEdited,
  setSlugEdited,
  primaryImage,
  setPrimaryImage,
  existingGallery,
  galleryFiles,
  setGalleryFiles,
  removedGalleryIds,
  setRemovedGalleryIds,
  galleryPreviews,
}: ProductFormTabsProps) {
  const isAdmin = variant === 'admin';
  const fetchCat = isAdmin ? fetchCategoryAdminOptions : fetchCategoryVendorOptions;
  const fetchBrand = isAdmin ? fetchBrandAdminOptions : fetchBrandVendorOptions;
  const fetchUnit = isAdmin ? fetchUnitAdminOptions : fetchUnitVendorOptions;

  const effectivePreview = computeEffectiveSalePrice(
    String(formData.price ?? ''),
    String(formData.discountType ?? ''),
    String(formData.discountValue ?? ''),
  );

  return (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="grid w-full grid-cols-5 mb-4">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
        <TabsTrigger value="media">Media</TabsTrigger>
        <TabsTrigger value="seo">SEO</TabsTrigger>
        <TabsTrigger value="vendor">Vendor Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4">
        {isAdmin ? (
          <div>
            <Label>Seller (leave empty for In-House)</Label>
            <AdminSearchCombobox
              queryKeyPrefix="product-vendor"
              value={String(formData.sellerId ?? '')}
              selectedLabel={String(formData.sellerLabel ?? '')}
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
        ) : null}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>
              Product Name <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Enter product name"
              value={String(formData.name ?? '')}
              onChange={(e) => updateField('name', e.target.value)}
              className={formErrors.name ? 'border-destructive' : ''}
            />
            {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
          </div>
          <div className="md:col-span-2">
            <Label>Slug</Label>
            <Input
              placeholder="product-slug"
              value={String(formData.slug ?? '')}
              onChange={(e) => {
                setSlugEdited(true);
                updateField('slug', slugifyText(e.target.value));
              }}
            />
          </div>
          <div>
            <Label>Product Type</Label>
            <Select value={String(formData.type || 'physical')} onValueChange={(v) => updateField('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="physical">Physical</SelectItem>
                <SelectItem value="digital">Digital</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <AdminSearchCombobox
              queryKeyPrefix={isAdmin ? 'product-category' : 'vendor-product-category'}
              value={String(formData.categoryId ?? '')}
              selectedLabel={String(formData.categoryLabel ?? '')}
              onChange={(v, l) => {
                setFormData((prev) => ({
                  ...prev,
                  categoryId: v,
                  categoryLabel: l ?? '',
                }));
              }}
              fetchOptions={fetchCat}
              placeholder="Search category…"
              clearable
            />
          </div>
          <div>
            <Label>Brand</Label>
            <AdminSearchCombobox
              queryKeyPrefix={isAdmin ? 'product-brand' : 'vendor-product-brand'}
              value={String(formData.brandId ?? '')}
              selectedLabel={String(formData.brandLabel ?? '')}
              onChange={(v, l) => {
                setFormData((prev) => ({
                  ...prev,
                  brandId: v,
                  brandLabel: l ?? '',
                }));
              }}
              fetchOptions={fetchBrand}
              placeholder="Search brand…"
              clearable
            />
          </div>
          <div>
            <Label>Unit</Label>
            <AdminSearchCombobox
              queryKeyPrefix={isAdmin ? 'product-unit' : 'vendor-product-unit'}
              value={String(formData.unitId ?? '')}
              selectedLabel={String(formData.unitLabel ?? '')}
              onChange={(v, l) => {
                setFormData((prev) => ({
                  ...prev,
                  unitId: v,
                  unitLabel: l ?? '',
                }));
              }}
              fetchOptions={fetchUnit}
              placeholder="Search unit…"
              clearable
            />
          </div>
        </div>
        <div>
          <Label>Short Description</Label>
          <Input
            placeholder="Brief product summary"
            value={String(formData.shortDescription ?? '')}
            onChange={(e) => updateField('shortDescription', e.target.value)}
          />
        </div>
        <div>
          <Label>Full Description</Label>
          <Textarea
            rows={5}
            placeholder="Detailed product description..."
            value={String(formData.description ?? '')}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Label>Has Variations</Label>
            <Switch checked={!!formData.hasVariations} onCheckedChange={(v) => updateField('hasVariations', v)} />
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Label>Featured</Label>
              <Switch checked={!!formData.featured} onCheckedChange={(v) => updateField('featured', v)} />
            </div>
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="pricing" className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>
              Regular Price (Rs.) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              placeholder="0"
              value={String(formData.price ?? '')}
              onChange={(e) => updateField('price', e.target.value)}
              className={formErrors.price ? 'border-destructive' : ''}
            />
            {formErrors.price && <p className="text-xs text-destructive mt-1">{formErrors.price}</p>}
          </div>
          <div>
            <Label>Discount type</Label>
            <Select
              value={String(formData.discountType || 'none')}
              onValueChange={(v) => updateField('discountType', v === 'none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="flat">Flat (Rs. off list)</SelectItem>
                <SelectItem value="percentage">Percentage off list</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>
              Discount{' '}
              {formData.discountType === 'percentage'
                ? '(%)'
                : formData.discountType === 'flat'
                  ? '(Rs.)'
                  : ''}
            </Label>
            <Input
              type="number"
              placeholder={formData.discountType ? '0' : '—'}
              disabled={!formData.discountType}
              value={String(formData.discountValue ?? '')}
              onChange={(e) => updateField('discountValue', e.target.value)}
            />
          </div>
          {effectivePreview != null ? (
            <div className="md:col-span-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Effective sale price: </span>
              <span className="font-medium">Rs. {effectivePreview.toLocaleString()}</span>
            </div>
          ) : null}
          <div>
            <Label>
              SKU (unique) <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="PROD-001"
              value={String(formData.sku ?? '')}
              onChange={(e) => updateField('sku', e.target.value)}
              className={formErrors.sku ? 'border-destructive' : ''}
            />
            {formErrors.sku && <p className="text-xs text-destructive mt-1">{formErrors.sku}</p>}
          </div>
          <div>
            <Label>Stock Quantity</Label>
            <Input
              type="number"
              placeholder="0"
              value={String(formData.stock ?? '')}
              onChange={(e) => updateField('stock', e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={String(formData.status || 'active')} onValueChange={(v) => updateField('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </TabsContent>

      <TabsContent value="media" className="space-y-4">
        {formData.existingImageUrl && !primaryImage ? (
          <div className="flex items-center gap-3">
            <img
              src={resolveMediaUrl(String(formData.existingImageUrl))}
              alt=""
              className="h-24 w-24 rounded-lg object-cover border"
            />
            <p className="text-xs text-muted-foreground">Current image. Choose a file below to replace.</p>
          </div>
        ) : null}
        <div>
          <Label>Primary Thumbnail</Label>
          <Input type="file" accept="image/*" onChange={(e) => setPrimaryImage(e.target.files?.[0] ?? null)} />
          {primaryImage ? (
            <Button type="button" variant="ghost" size="sm" className="mt-1 h-8 text-xs" onClick={() => setPrimaryImage(null)}>
              Clear primary
            </Button>
          ) : null}
        </div>
        {formErrors.image && <p className="text-xs text-destructive mt-1">{formErrors.image}</p>}
        <div>
          <Label>Gallery images</Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            className="cursor-pointer"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              const keptExisting = existingGallery.filter((g) => !removedGalleryIds.includes(g.id)).length;
              const room = Math.max(0, MAX_PRODUCT_GALLERY - keptExisting - galleryFiles.length);
              const next = room > 0 ? [...galleryFiles, ...picked.slice(0, room)] : galleryFiles;
              setGalleryFiles(next);
              e.target.value = '';
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Select multiple images in one picker, or add more in batches. Up to {MAX_PRODUCT_GALLERY} gallery images total
            (primary is separate).
          </p>
        </div>
        {existingGallery.some((g) => !removedGalleryIds.includes(g.id)) || galleryFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {existingGallery
              .filter((g) => !removedGalleryIds.includes(g.id))
              .map((g) => (
                <div key={g.id} className="relative inline-block">
                  <img src={resolveMediaUrl(g.image_url)} alt="" className="h-20 w-20 rounded-md border object-cover" />
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow"
                    aria-label="Remove gallery image"
                    onClick={() => setRemovedGalleryIds((prev) => (prev.includes(g.id) ? prev : [...prev, g.id]))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            {galleryFiles.map((file, i) => (
              <div key={`${file.name}-${file.size}-${i}`} className="relative inline-block">
                <img src={galleryPreviews[i]} alt="" className="h-20 w-20 rounded-md border object-cover" />
                <button
                  type="button"
                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow"
                  aria-label="Remove pending image"
                  onClick={() => setGalleryFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="seo" className="space-y-4">
        <div>
          <Label>SEO Title</Label>
          <Input
            placeholder="Page title for search engines"
            value={String(formData.seoTitle ?? '')}
            onChange={(e) => updateField('seoTitle', e.target.value)}
          />
        </div>
        <div>
          <Label>Meta Description</Label>
          <Textarea
            rows={2}
            placeholder="Description for search results"
            value={String(formData.seoDescription ?? '')}
            onChange={(e) => updateField('seoDescription', e.target.value)}
          />
        </div>
        <div>
          <Label>Meta Keywords</Label>
          <Input
            placeholder="keyword1, keyword2, ..."
            value={String(formData.seoKeywords ?? '')}
            onChange={(e) => updateField('seoKeywords', e.target.value)}
          />
        </div>
      </TabsContent>

      <TabsContent value="vendor" className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <CardTitle className="text-sm">Vendor Feature Access</CardTitle>
            <p className="text-xs text-muted-foreground">
              Control which features are enabled when this product is managed by a vendor.
            </p>
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
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
