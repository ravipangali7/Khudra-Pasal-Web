import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, MoreVertical, Edit, Trash2 } from 'lucide-react';
import AdminTable from '@/components/admin/AdminTable';
import { CRUDModal } from '@/components/admin/CRUDModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { extractResults, vendorApi } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { buildVendorModulePath } from '../moduleRegistry';

export default function VendorProductsModule({ activeSection }: { activeSection: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAdd = activeSection === 'add-product';
  const isDedicatedAddPage = activeSection === 'add-product-page';
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(isAdd);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    setModalOpen(isAdd);
  }, [isAdd]);

  const { data: productsResp, refetch } = useQuery({
    queryKey: ['vendor', 'products', statusFilter],
    queryFn: () => vendorApi.products({ page_size: 100, ...(statusFilter ? { status: statusFilter } : {}) }),
  });
  const products = useMemo(() => extractResults<Record<string, unknown>>(productsResp), [productsResp]);

  const { data: catData } = useQuery({
    queryKey: ['vendor', 'catalog', 'cat'],
    queryFn: () => vendorApi.catalogCategories(),
  });
  const { data: brandData } = useQuery({
    queryKey: ['vendor', 'catalog', 'brand'],
    queryFn: () => vendorApi.catalogBrands(),
  });
  const { data: unitData } = useQuery({
    queryKey: ['vendor', 'catalog', 'unit'],
    queryFn: () => vendorApi.catalogUnits(),
  });

  const categories = catData?.results ?? [];
  const brands = brandData?.results ?? [];
  const units = unitData?.results ?? [];

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [productStatus, setProductStatus] = useState('draft');
  const [desc, setDesc] = useState('');
  const [colorHex, setColorHex] = useState('#000000');

  const loadProduct = async (id: string) => {
    const p = await vendorApi.productDetail(id);
    setEditId(id);
    setName(String(p.name ?? ''));
    setSlug(String(p.slug ?? ''));
    setSku(String(p.sku ?? ''));
    setCategoryId(String(p.category_id ?? ''));
    setBrandId(String(p.brand_id ?? ''));
    setUnitId(String(p.unit_id ?? ''));
    setPrice(String(p.price ?? ''));
    setStock(String(p.stock ?? '0'));
    setProductStatus(String(p.status ?? 'draft'));
    setDesc(String(p.description ?? ''));
    const attrs = (p.attributes as Record<string, unknown>) || {};
    setColorHex(String(attrs.color ?? '#000000'));
    setModalOpen(true);
  };

  useEffect(() => {
    if (!name.trim() || editId) return;
    const t = setTimeout(() => {
      void vendorApi
        .productSlugPreview(name.trim())
        .then((r) => setSlug(r.slug))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [name, editId]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('name', name);
      if (slug) fd.append('slug', slug);
      fd.append('sku', sku);
      fd.append('category_id', categoryId);
      if (brandId) fd.append('brand_id', brandId);
      if (unitId) fd.append('unit_id', unitId);
      fd.append('price', price || '0');
      fd.append('stock', stock || '0');
      fd.append('status', productStatus);
      fd.append('description', desc);
      fd.append('attributes', JSON.stringify({ color: colorHex }));
      const img = (document.getElementById('product-image') as HTMLInputElement | null)?.files?.[0];
      if (editId) {
        if (img) fd.append('image', img);
        return vendorApi.updateProduct(editId, fd);
      }
      if (!img) throw new Error('Image is required for new products');
      fd.append('image', img);
      return vendorApi.createProduct(fd);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'products'] });
      void qc.invalidateQueries({ queryKey: ['vendor', 'summary'] });
      toast.success(editId ? 'Product updated' : 'Product created');
      setModalOpen(false);
      setEditId(null);
      navigate(buildVendorModulePath('all-products'));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => vendorApi.deleteProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'products'] });
      toast.success('Product deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

        <div className="flex items-center gap-2 self-start sm:self-auto sm:ml-auto">
          <Button
            variant="outline"
            onClick={() => {
              setEditId(null);
              setName('');
              setSlug('');
              setSku('');
              setCategoryId('');
              setBrandId('');
              setUnitId('');
              setPrice('');
              setStock('0');
              setProductStatus('draft');
              setDesc('');
              setColorHex('#000000');
              navigate(buildVendorModulePath('add-product-page'));
            }}
          >
            Open Full Page
          </Button>
          <Button
            onClick={() => {
              setEditId(null);
              setName('');
              setSlug('');
              setSku('');
              setCategoryId('');
              setBrandId('');
              setUnitId('');
              setPrice('');
              setStock('0');
              setProductStatus('draft');
              setDesc('');
              setColorHex('#000000');
              setModalOpen(true);
            }}
          >
            Add Product
          </Button>
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
                  <DropdownMenuItem onClick={() => void loadProduct(String(p.id))}>
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
        onFilter={() => refetch()}
      />

      {isDedicatedAddPage && !editId ? (
        <div className="mt-6 rounded-xl border bg-card p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold">Create product</h3>
            <Button variant="ghost" onClick={() => navigate(buildVendorModulePath('all-products'))}>
              Back to list
            </Button>
          </div>
          <div className="space-y-4 pr-1">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={String(c.id)} value={String(c.id)}>{String(c.name)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={brandId || 'none'} onValueChange={(v) => setBrandId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{brands.map((b) => <SelectItem key={String(b.id)} value={String(b.id)}>{String(b.name)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={unitId || 'none'} onValueChange={(v) => setUnitId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem>{units.map((u) => <SelectItem key={String(u.id)} value={String(u.id)}>{String(u.name)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={productStatus} onValueChange={setProductStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="out_of_stock">Out of stock</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-end gap-2">
                <div className="flex-1">
                  <Label>Color (saved in attributes)</Label>
                  <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} placeholder="#RRGGBB" />
                </div>
                <input type="color" aria-label="Color picker" className="h-10 w-14 cursor-pointer rounded border bg-background" value={colorHex.match(/^#[0-9a-fA-F]{6}$/) ? colorHex : '#000000'} onChange={(e) => setColorHex(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Image (required)</Label>
                <Input id="product-image" type="file" accept="image/*" />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div className="md:col-span-2 flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => navigate(buildVendorModulePath('all-products'))}>Cancel</Button>
                <Button onClick={() => saveMut.mutate()}>Save Product</Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <CRUDModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          navigate(buildVendorModulePath('all-products'));
        }}
        title={editId ? 'Edit product' : 'Add product'}
        size="lg"
        onSave={() => saveMut.mutate()}
      >
        <div className="space-y-4 pr-1">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={String(c.id)} value={String(c.id)}>
                      {String(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select value={brandId || 'none'} onValueChange={(v) => setBrandId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={String(b.id)} value={String(b.id)}>
                      {String(b.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unitId || 'none'} onValueChange={(v) => setUnitId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={String(u.id)} value={String(u.id)}>
                      {String(u.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Price</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={productStatus} onValueChange={setProductStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="out_of_stock">Out of stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-end gap-2">
              <div className="flex-1">
                <Label>Color (saved in attributes)</Label>
                <Input value={colorHex} onChange={(e) => setColorHex(e.target.value)} placeholder="#RRGGBB" />
              </div>
              <input
                type="color"
                aria-label="Color picker"
                className="h-10 w-14 cursor-pointer rounded border bg-background"
                value={colorHex.match(/^#[0-9a-fA-F]{6}$/) ? colorHex : '#000000'}
                onChange={(e) => setColorHex(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Image {editId ? '(optional replace)' : '(required)'}</Label>
              <Input id="product-image" type="file" accept="image/*" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          </div>
        </div>
      </CRUDModal>
    </div>
  );
}
