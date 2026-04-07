import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, MoreVertical, Edit, Trash2 } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractResults, vendorApi } from '@/lib/api';
import { toast } from 'sonner';
import { buildVendorModulePath } from '../moduleRegistry';
import { useVendorRouteContext } from '../vendorRouteContext';
import { ProductFormTabs } from '@/components/admin/ProductFormTabs';
import { buildProductFormData, mapVendorProductDetailToForm } from '@/components/admin/productFormUtils';
import { formatApiError, slugifyText } from '@/pages/admin/hooks/adminFormUtils';

export default function VendorProductsModule({ activeSection }: { activeSection: string }) {
  const qc = useQueryClient();
  const vendorRoute = useVendorRouteContext();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const routeAdd = vendorRoute?.action === 'add';
  const routeEdit = vendorRoute?.action === 'edit';
  const resolvedModalOpen = Boolean(routeAdd || routeEdit);
  const detailId = vendorRoute?.itemId;

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [slugEdited, setSlugEdited] = useState(false);
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [existingGallery, setExistingGallery] = useState<{ id: string; image_url: string; sort_order: number }[]>(
    [],
  );
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [removedGalleryIds, setRemovedGalleryIds] = useState<string[]>([]);
  const [saveError, setSaveError] = useState('');
  const hydratedEditProductIdRef = useRef<string | null>(null);
  const galleryPreviews = useMemo(() => galleryFiles.map((f) => URL.createObjectURL(f)), [galleryFiles]);
  useEffect(() => {
    return () => {
      galleryPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [galleryPreviews]);

  const { data: productsResp, refetch } = useQuery({
    queryKey: ['vendor', 'products', statusFilter],
    queryFn: () => vendorApi.products({ page_size: 100, ...(statusFilter ? { status: statusFilter } : {}) }),
  });
  const products = useMemo(() => extractResults<Record<string, unknown>>(productsResp), [productsResp]);

  const { data: productDetail } = useQuery({
    queryKey: ['vendor', 'product', detailId],
    queryFn: () => vendorApi.productDetail(detailId!),
    enabled: Boolean(detailId && routeEdit),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!routeEdit || !resolvedModalOpen) {
      hydratedEditProductIdRef.current = null;
    }
  }, [routeEdit, resolvedModalOpen]);

  useEffect(() => {
    if (routeAdd && resolvedModalOpen) {
      hydratedEditProductIdRef.current = null;
      setFormData({ status: 'draft' });
      setSlugEdited(false);
      setPrimaryImage(null);
      setExistingGallery([]);
      setGalleryFiles([]);
      setRemovedGalleryIds([]);
      setFormErrors({});
      setSaveError('');
    }
  }, [routeAdd, resolvedModalOpen]);

  useEffect(() => {
    if (!productDetail || !routeEdit || !detailId) return;
    const idKey = String(detailId);
    if (String(productDetail.id) !== idKey) return;

    if (hydratedEditProductIdRef.current !== idKey) {
      hydratedEditProductIdRef.current = idKey;
      setFormData(mapVendorProductDetailToForm(productDetail));
      setSlugEdited(true);
      setPrimaryImage(null);
      setExistingGallery(productDetail.images ?? []);
      setGalleryFiles([]);
      setRemovedGalleryIds([]);
      setFormErrors({});
    } else {
      setExistingGallery(productDetail.images ?? []);
    }
  }, [productDetail, routeEdit, detailId]);

  const keptGalleryCount = useMemo(
    () => existingGallery.filter((g) => !removedGalleryIds.includes(g.id)).length,
    [existingGallery, removedGalleryIds],
  );
  const hasUsableProductImage = useMemo(() => {
    if (primaryImage) return true;
    if (formData.existingImageUrl) return true;
    if (keptGalleryCount > 0 || galleryFiles.length > 0) return true;
    return false;
  }, [primaryImage, formData.existingImageUrl, keptGalleryCount, galleryFiles.length]);

  const updateField = (key: string, value: unknown) => {
    setFormData((prev) => {
      if (key === 'name') {
        return { ...prev, [key]: value, slug: slugEdited ? prev.slug : slugifyText(String(value ?? '')) };
      }
      return { ...prev, [key]: value };
    });
    if (formErrors[key]) setFormErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  };

  const createMut = useMutation({
    mutationFn: (fd: FormData) => vendorApi.createProduct(fd),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'products'] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'summary'] });
      toast.success('Product created');
      vendorRoute?.navigateToList();
      resetFormState();
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormData }) => vendorApi.updateProduct(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'products'] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'product', detailId] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'summary'] });
      toast.success('Product updated');
      vendorRoute?.navigateToList();
      resetFormState();
    },
  });

  function resetFormState() {
    setFormData({});
    setFormErrors({});
    setSaveError('');
    setPrimaryImage(null);
    setSlugEdited(false);
    setExistingGallery([]);
    setGalleryFiles([]);
    setRemovedGalleryIds([]);
  }

  const delMut = useMutation({
    mutationFn: (id: string) => vendorApi.deleteProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'products'] });
      toast.success('Product deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onSaveProduct = async () => {
    setSaveError('');
    const errors: Record<string, string> = {};
    if (!formData.name || !String(formData.name).trim()) errors.name = 'Product name is required';
    if (!formData.price || Number(formData.price) <= 0) errors.price = 'Valid price is required';
    if (!formData.sku || !String(formData.sku).trim()) errors.sku = 'SKU is required';
    if (!routeEdit && !primaryImage) errors.image = 'Primary image is required';
    if (routeEdit && !hasUsableProductImage) {
      errors.image = 'Product image is missing; upload a primary image or at least one gallery image';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    const fd = buildProductFormData(formData, {
      isEdit: Boolean(routeEdit),
      primaryImage,
      galleryFiles,
      removedGalleryIds,
      includeSeller: false,
      includeFeatured: false,
    });
    try {
      if (routeEdit && detailId) {
        await updateMut.mutateAsync({ id: detailId, payload: fd });
      } else {
        await createMut.mutateAsync(fd);
      }
    } catch (e) {
      setSaveError(formatApiError(e));
    }
  };

  if (activeSection !== 'all-products') return null;

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={statusFilter || 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="out_of_stock">Out of stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

      </div>

      <AdminTable
        title="Products"
        subtitle="Your catalog (synced with the API)"
        data={products}
        columns={[
          {
            key: 'name',
            label: 'Product',
            render: (p) => (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-muted overflow-hidden flex items-center justify-center">
                  {p.image_url ? (
                    <img src={String(p.image_url)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{String(p.name)}</p>
                  <p className="text-xs text-muted-foreground">SKU: {String(p.sku)}</p>
                </div>
              </div>
            ),
          },
          { key: 'price', label: 'Price', render: (p) => <span className="font-medium">Rs. {String(p.price)}</span> },
          {
            key: 'stock',
            label: 'Stock',
            render: (p) => (
              <Badge variant={Number(p.stock) === 0 ? 'destructive' : 'secondary'} className="text-xs">
                {String(p.stock)}
              </Badge>
            ),
          },
          { key: 'sales', label: 'Sales', render: (p) => String(p.sales ?? 0) },
          {
            key: 'status',
            label: 'Status',
            render: (p) => (
              <Badge variant="outline" className="text-xs capitalize">
                {String(p.status)}
              </Badge>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (p) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => vendorRoute?.navigateToEdit(String(p.id))}>
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      if (confirm('Delete this product?')) delMut.mutate(String(p.id));
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
        onAdd={() => vendorRoute?.navigateToAdd()}
        addLabel="Add Product"
        onFilter={() => refetch()}
      />

      <CRUDModal
        open={resolvedModalOpen}
        onClose={() => {
          vendorRoute?.navigateToList();
          resetFormState();
        }}
        title={routeEdit ? 'Edit Product' : 'Add Product'}
        size="xl"
        loading={createMut.isPending || updateMut.isPending}
        error={saveError || undefined}
        onSave={() => void onSaveProduct()}
      >
        <ProductFormTabs
          variant="vendor"
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          updateField={updateField}
          slugEdited={slugEdited}
          setSlugEdited={setSlugEdited}
          primaryImage={primaryImage}
          setPrimaryImage={setPrimaryImage}
          existingGallery={existingGallery}
          galleryFiles={galleryFiles}
          setGalleryFiles={setGalleryFiles}
          removedGalleryIds={removedGalleryIds}
          setRemovedGalleryIds={setRemovedGalleryIds}
          galleryPreviews={galleryPreviews}
        />
      </CRUDModal>
    </div>
  );
}
