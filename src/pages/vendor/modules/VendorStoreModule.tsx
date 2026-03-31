import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  Camera,
  Lock,
  MapPin,
  Package,
  Pencil,
  Star,
  Store,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { extractResults, vendorApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { mapApiReelToUi } from '@/modules/reels/api/reelMappers';
import { useVendorReelViewer } from '@/modules/reels/vendor/VendorReelViewerContext';

type VendorProfileRow = {
  id?: string;
  store_name?: string;
  store_slug?: string;
  description?: string;
  contact_email?: string;
  phone?: string;
  address?: string;
  logo_url?: string | null;
  banner_url?: string | null;
  status?: string;
  rating?: number;
  is_verified?: boolean;
  product_count?: number;
  review_count?: number;
};

function splitDescription(desc: string): { highlights: string[]; bio: string } {
  const t = desc.trim();
  const nl = t.indexOf('\n');
  if (nl > 0) {
    const first = t.slice(0, nl).trim();
    if (first.includes('|')) {
      return {
        highlights: first.split('|').map((s) => s.trim()).filter(Boolean),
        bio: t.slice(nl + 1).trim(),
      };
    }
  }
  return { highlights: [], bio: t };
}

function formatStatNumber(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n >= 1000) {
    const k = n / 1000;
    const s = k >= 10 ? Math.round(k).toString() : k.toFixed(1).replace(/\.0$/, '');
    return `${s}k`;
  }
  return n.toLocaleString();
}

function formatRating(r: number): string {
  if (!Number.isFinite(r) || r <= 0) return '—';
  return r.toFixed(1);
}

export default function VendorStoreModule() {
  const qc = useQueryClient();
  const reelViewer = useVendorReelViewer();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerObjectUrlRef = useRef<string | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor', 'profile'],
    queryFn: () => vendorApi.profile() as Promise<VendorProfileRow>,
  });

  const { data: summary } = useQuery({
    queryKey: ['vendor', 'summary'],
    queryFn: () => vendorApi.summary(),
  });
  const { data: favouriteReelsResp } = useQuery({
    queryKey: ['vendor', 'reels-favourites'],
    queryFn: () => vendorApi.favouriteReels({ page_size: 8 }),
  });

  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [oldP, setOldP] = useState('');
  const [newP, setNewP] = useState('');
  const [newP2, setNewP2] = useState('');

  useEffect(() => {
    if (!data) return;
    setStoreName(String(data.store_name ?? ''));
    setDescription(String(data.description ?? ''));
    setContactEmail(String(data.contact_email ?? ''));
    setPhone(String(data.phone ?? ''));
    setAddress(String(data.address ?? ''));
    // If we were previewing local files, switch back to backend URLs on refresh/GET.
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }
    setLogoPreview(String(data.logo_url ?? '') || null);
    setBannerPreview(String(data.banner_url ?? '') || null);
  }, [data]);

  useEffect(() => {
    return () => {
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
      if (bannerObjectUrlRef.current) URL.revokeObjectURL(bannerObjectUrlRef.current);
    };
  }, []);

  const saveMut = useMutation({
    mutationFn: (fd: FormData) => vendorApi.updateProfile(fd),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor'] });
      toast.success('Store profile saved');
      setEditOpen(false);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      if (logoInputRef.current) logoInputRef.current.value = '';
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pwdMut = useMutation({
    mutationFn: () => vendorApi.changePassword(oldP, newP),
    onSuccess: () => {
      toast.success('Password updated');
      setOldP('');
      setNewP('');
      setNewP2('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('store_name', storeName);
    fd.append('description', description);
    fd.append('contact_email', contactEmail);
    fd.append('phone', phone);
    fd.append('address', address);
    const logoInput = logoInputRef.current?.files?.[0];
    const bannerInput = bannerInputRef.current?.files?.[0];
    if (logoInput) fd.append('logo', logoInput);
    if (bannerInput) fd.append('banner', bannerInput);
    saveMut.mutate(fd);
  };

  const productCount =
    typeof data?.product_count === 'number' ? data.product_count : (summary?.product_count ?? 0);
  const reviewCount = typeof data?.review_count === 'number' ? data.review_count : 0;
  const ratingVal = typeof data?.rating === 'number' ? data.rating : 0;
  const isVerified = Boolean(data?.is_verified);
  const descSource = description || (data?.description ?? '');
  const { highlights, bio } = splitDescription(descSource);
  const favouriteReels = extractResults(favouriteReelsResp).map(mapApiReelToUi);

  if (isLoading && !data) {
    return <div className="p-6 text-muted-foreground">Loading profile…</div>;
  }

  return (
    <div className="p-4 lg:p-6 w-full max-w-none space-y-6">
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f) {
            if (bannerObjectUrlRef.current) URL.revokeObjectURL(bannerObjectUrlRef.current);
            const url = URL.createObjectURL(f);
            bannerObjectUrlRef.current = url;
            setBannerPreview(url);
          }
        }}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        onChange={(ev) => {
          const f = ev.target.files?.[0];
          if (f) {
            if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
            const url = URL.createObjectURL(f);
            logoObjectUrlRef.current = url;
            setLogoPreview(url);
          }
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div
          className={cn(
            'relative h-44 sm:h-52 w-full',
            !bannerPreview &&
              'bg-gradient-to-r from-[hsl(28,90%,92%)] via-[hsl(320,40%,96%)] to-[hsl(270,35%,94%)]',
          )}
        >
          {bannerPreview ? (
            <img src={bannerPreview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Store className="h-14 w-14 text-muted-foreground/25" strokeWidth={1.25} />
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute bottom-3 right-3 gap-2 rounded-lg border border-border/80 bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background"
            onClick={() => bannerInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Edit Cover
          </Button>
        </div>

        <div className="relative px-4 pb-8 pt-0 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:gap-6">
              <div className="relative -mt-14 w-fit shrink-0 sm:-mt-16">
                <div
                  className={cn(
                    'relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-muted shadow-md sm:h-32 sm:w-32',
                  )}
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.25} />
                  )}
                </div>
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-card transition hover:opacity-90"
                  aria-label="Change store logo"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0 flex-1 space-y-3 pt-0 sm:pt-3 lg:pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {storeName || data?.store_name || 'Your store'}
                  </h1>
                  {isVerified ? (
                    <BadgeCheck
                      className="h-6 w-6 shrink-0 text-[hsl(217,91%,55%)]"
                      aria-label="Verified store"
                    />
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {address ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                      <span className="line-clamp-1">{address}</span>
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4 shrink-0 fill-primary text-primary" />
                    <span>
                      {formatRating(ratingVal)}
                      {reviewCount > 0 ? ` (${formatStatNumber(reviewCount)})` : ''}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0 text-primary" />
                    <span>—</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="h-4 w-4 shrink-0 text-primary" />
                    <span>{formatStatNumber(productCount)} products</span>
                  </span>
                </div>

                {highlights.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {highlights.map((h, i) => (
                      <span key={i}>
                        {i > 0 ? <span className="mx-2 text-border">|</span> : null}
                        {h}
                      </span>
                    ))}
                  </p>
                ) : null}

                {bio ? (
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {bio}
                  </p>
                ) : highlights.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">No description yet.</p>
                ) : null}
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2 self-start rounded-lg border-border bg-card"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            icon: Users,
            value: '—',
            label: 'Followers',
            iconClass: '' as const,
          },
          {
            icon: Package,
            value: formatStatNumber(productCount),
            label: 'Products',
            iconClass: '' as const,
          },
          {
            icon: Star,
            value: formatRating(ratingVal),
            label: 'Rating',
            iconClass: 'fill-primary' as const,
          },
          {
            icon: Star,
            value: favouriteReels.length.toLocaleString(),
            label: 'Favourites',
            iconClass: 'fill-none' as const,
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-5 text-center shadow-sm"
          >
            <item.icon
              className={cn('h-6 w-6 text-primary', item.iconClass)}
            />
            <span className="text-xl font-bold tabular-nums text-foreground">{item.value}</span>
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Favourite reels</h3>
          <span className="text-xs text-muted-foreground">{favouriteReels.length} saved</span>
        </div>
        {favouriteReels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No favourite reels yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {favouriteReels.map((reel) => (
              <button
                key={reel.id}
                type="button"
                onClick={() => reelViewer?.openReelViewer(reel.id)}
                className="text-left rounded-xl overflow-hidden border border-border bg-muted/20 hover:border-primary/40 transition-colors"
              >
                <div className="aspect-[9/16]">
                  <img src={reel.thumbnail || reel.product.image} alt={reel.product.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium line-clamp-1">{reel.product.name}</p>
                  <p className="text-[11px] text-muted-foreground">{reel.views.toLocaleString()} views</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Account password
          </CardTitle>
          <CardDescription>Change the password you use to sign in to the vendor portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Current password</Label>
            <Input type="password" value={oldP} onChange={(e) => setOldP(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="password" value={newP} onChange={(e) => setNewP(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label>Confirm</Label>
            <Input type="password" value={newP2} onChange={(e) => setNewP2(e.target.value)} autoComplete="new-password" />
          </div>
          <Button
            type="button"
            onClick={() => {
              if (newP.length < 6) {
                toast.error('New password must be at least 6 characters');
                return;
              }
              if (newP !== newP2) {
                toast.error('Passwords do not match');
                return;
              }
              pwdMut.mutate();
            }}
            disabled={pwdMut.isPending}
          >
            {pwdMut.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>Edit store profile</DialogTitle>
              <DialogDescription>
                Update your store details and images. Changes are saved to the backend and will reflect everywhere after refresh.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div
                  className={cn(
                    'relative h-36 sm:h-40 w-full',
                    !bannerPreview &&
                      'bg-gradient-to-r from-[hsl(28,90%,92%)] via-[hsl(320,40%,96%)] to-[hsl(270,35%,94%)]',
                  )}
                >
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Store className="h-12 w-12 text-muted-foreground/25" strokeWidth={1.25} />
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-3 right-3 gap-2 rounded-lg border border-border/80 bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background"
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    Change Cover
                  </Button>
                </div>

                <div className="relative px-4 pb-5 pt-0 sm:px-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="flex items-end gap-4">
                      <div className="relative -mt-10 w-fit shrink-0 sm:-mt-12">
                        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-4 border-card bg-muted shadow-md sm:h-24 sm:w-24">
                          {logoPreview ? (
                            <img src={logoPreview} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Store className="h-9 w-9 text-muted-foreground/40" strokeWidth={1.25} />
                          )}
                        </div>
                        <button
                          type="button"
                          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-card transition hover:opacity-90"
                          aria-label="Change store logo"
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="min-w-0 pb-1">
                        <p className="text-sm font-semibold text-foreground">Store images</p>
                        <p className="text-xs text-muted-foreground">
                          Cover and logo are uploaded when you click “Save changes”.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Store name</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder={'Optional: first line with tags, then blank line, then bio.\nExample line 1: 🌿 Organic | 🇳🇵 Nepali'}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Contact email</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
