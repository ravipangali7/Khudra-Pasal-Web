import type { AdminProductDetail, VendorProductDetail } from '@/lib/api';
import { appendIfDefined } from '@/pages/admin/hooks/adminFormUtils';

export const MAX_PRODUCT_GALLERY = 15;

export function computeEffectiveSalePrice(
  listStr: string,
  discountType: string,
  discountStr: string,
): number | null {
  const list = Number(listStr);
  const d = Number(discountStr);
  if (!Number.isFinite(list) || list <= 0) return null;
  if (discountType !== 'flat' && discountType !== 'percentage') return null;
  if (!Number.isFinite(d) || d <= 0) return null;
  if (discountType === 'percentage') {
    if (d > 100) return null;
    return Math.round(((list * (100 - d)) / 100) * 100) / 100;
  }
  if (d >= list) return null;
  return Math.round((list - d) * 100) / 100;
}

export function mapAdminProductDetailToForm(d: AdminProductDetail) {
  return {
    name: d.name,
    slug: d.slug,
    sku: d.sku,
    price: String(d.price),
    discountType: d.discount_type || '',
    discountValue: d.discount != null ? String(d.discount) : '',
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
    hasVariations: d.has_variations,
    featured: d.is_featured,
    enableReels: d.enable_reels,
    enablePos: d.enable_pos,
    sellerId: d.seller_id || '',
    sellerLabel: d.seller_name || '',
    existingImageUrl: d.image_url,
  };
}

export function mapVendorProductDetailToForm(d: VendorProductDetail) {
  return {
    name: d.name,
    slug: d.slug,
    sku: d.sku,
    price: String(d.price),
    discountType: d.discount_type || '',
    discountValue: d.discount != null ? String(d.discount) : '',
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
    hasVariations: d.has_variations,
    featured: false,
    enableReels: d.enable_reels,
    enablePos: d.enable_pos,
    sellerId: '',
    sellerLabel: '',
    existingImageUrl: d.image_url,
  };
}

export function buildProductFormData(
  formData: Record<string, unknown>,
  opts: {
    isEdit: boolean;
    primaryImage: File | null;
    galleryFiles: File[];
    removedGalleryIds: string[];
    includeSeller: boolean;
    includeFeatured: boolean;
  },
): FormData {
  const fd = new FormData();
  appendIfDefined(fd, 'name', formData.name);
  appendIfDefined(fd, 'slug', formData.slug);
  appendIfDefined(fd, 'sku', formData.sku);
  appendIfDefined(fd, 'price', formData.price);
  fd.append('discount_type', String(formData.discountType ?? ''));
  fd.append('discount', String(formData.discountValue ?? ''));
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
  appendIfDefined(fd, 'tax_percent', '0');
  appendIfDefined(fd, 'has_variations', formData.hasVariations ? 'true' : 'false');
  if (opts.includeFeatured) {
    appendIfDefined(fd, 'is_featured', formData.featured ? 'true' : 'false');
  }
  appendIfDefined(fd, 'enable_reels', formData.enableReels ? 'true' : 'false');
  appendIfDefined(fd, 'enable_pos', formData.enablePos ? 'true' : 'false');
  if (opts.includeSeller) {
    if (opts.isEdit) {
      fd.append('seller_id', formData.sellerId ? String(formData.sellerId) : '');
    } else if (formData.sellerId) {
      fd.append('seller_id', String(formData.sellerId));
    }
  }
  if (opts.primaryImage) fd.append('image', opts.primaryImage);
  opts.galleryFiles.forEach((f) => fd.append('gallery_images', f));
  opts.removedGalleryIds.forEach((id) => fd.append('delete_gallery_image_ids', id));
  return fd;
}
