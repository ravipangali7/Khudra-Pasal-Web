import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Camera,
  LogOut,
  MapPin,
  Package,
  Star,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { extractResults, portalApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { mapApiReelToUi } from '@/modules/reels/api/reelMappers';

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

type Props = {
  /** Opens portal logout confirm (parent shell); keeps logout off the public storefront. */
  onSignOutClick?: () => void;
};

export default function PortalCustomerProfileModule({ onSignOutClick }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerObjectUrlRef = useRef<string | null>(null);
  const logoObjectUrlRef = useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'self-profile'],
    queryFn: () => portalApi.selfProfile(),
  });

  const { data: favouriteReelsResp } = useQuery({
    queryKey: ['portal', 'reels-favourites'],
    queryFn: () => portalApi.favouriteReels({ page_size: 32 }),
  });

  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setStoreName(String(data.store_name ?? (data as { name?: string }).name ?? ''));
    setDescription(String(data.description ?? ''));
    setContactEmail(
      String(data.contact_email ?? (data as { email?: string }).email ?? ''),
    );
    setPhone(String(data.phone ?? ''));
    setAddress(String(data.address ?? ''));
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current);
      logoObjectUrlRef.current = null;
    }
    if (bannerObjectUrlRef.current) {
      URL.revokeObjectURL(bannerObjectUrlRef.current);
      bannerObjectUrlRef.current = null;
    }
    const logo =
      String((data as { logo_url?: string; avatar_url?: string }).logo_url ?? '') ||
      String((data as { avatar_url?: string }).avatar_url ?? '');
    setLogoPreview(logo || null);
    setBannerPreview(String(data.banner_url ?? '') || null);
  }, [data]);

  useEffect(() => {
    return () => {
      if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
      if (bannerObjectUrlRef.current) URL.revokeObjectURL(bannerObjectUrlRef.current);
    };
  }, []);

  const saveMut = useMutation({
    mutationFn: (fd: FormData) => portalApi.updateSelfProfile(fd),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portal'] });
      toast.success('Profile saved');
      if (bannerInputRef.current) bannerInputRef.current.value = '';
      if (logoInputRef.current) logoInputRef.current.value = '';
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

  const ordersCount =
    typeof data?.product_count === 'number' ? data.product_count : 0;
  const reviewCount = typeof data?.review_count === 'number' ? data.review_count : 0;
  const favCountApi =
    typeof data?.favourite_reels_count === 'number' ? data.favourite_reels_count : undefined;
  const ratingVal = typeof data?.rating === 'number' ? data.rating : 0;
  const isVerified = Boolean(data?.is_verified);
  const descSource = description || (data?.description ?? '');
  const { highlights, bio } = splitDescription(descSource);
  const favouriteReels = extractResults(favouriteReelsResp).map(mapApiReelToUi);
  const favStat =
    typeof favCountApi === 'number' ? favCountApi : favouriteReels.length;
  const favListTruncated =
    typeof favCountApi === 'number' && favouriteReels.length < favCountApi;

  if (isLoading && !data) {
    return <div className="p-6 text-muted-foreground">Loading profile…</div>;
  }

  return (
    <div className="w-full max-w-none space-y-6">
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
              <UserRound className="h-14 w-14 text-muted-foreground/25" strokeWidth={1.25} />
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
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
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
                    <UserRound className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.25} />
                  )}
                </div>
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-card transition hover:opacity-90"
                  aria-label="Change profile photo"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0 flex-1 space-y-3 pt-0 sm:pt-3 lg:pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {storeName || data?.store_name || 'Your profile'}
                  </h1>
                  {isVerified ? (
                    <BadgeCheck
                      className="h-6 w-6 shrink-0 text-[hsl(217,91%,55%)]"
                      aria-label="Verified account"
                    />
                  ) : null}
                </div>

                <p className="text-xs text-muted-foreground">
                  {data?.kid ? (
                    <>
                      KID <span className="font-mono">{data.kid}</span>
                      {data.username ? (
                        <>
                          {' '}
                          · @{data.username}
                        </>
                      ) : null}
                    </>
                  ) : null}
                </p>

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
                      {reviewCount > 0 ? ` (${formatStatNumber(reviewCount)} reviews)` : ''}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-4 w-4 shrink-0 text-primary" />
                    <span>—</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="h-4 w-4 shrink-0 text-primary" />
                    <span>{formatStatNumber(ordersCount)} orders</span>
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
          </div>
        </div>
      </div>

      <Card className="border-primary/10 shadow-sm">
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
          <CardDescription>
            Update your public name, description, and contact info. Change cover and profile photo from the header above,
            then save here to upload them with your other changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="portal-profile-display-name">Display name</Label>
              <Input
                id="portal-profile-display-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-profile-description">Description</Label>
              <Textarea
                id="portal-profile-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder={
                  'Optional: first line with tags, then blank line, then bio.\nExample line 1: 🌿 Shop local | 🇳🇵 Nepal'
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="portal-profile-email">Contact email</Label>
                <Input
                  id="portal-profile-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal-profile-phone">Phone</Label>
                <Input id="portal-profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-profile-address">Address</Label>
              <Input id="portal-profile-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <Button type="submit" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </CardContent>
      </Card>

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
            value: formatStatNumber(ordersCount),
            label: 'Orders',
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
            value: favStat.toLocaleString(),
            label: 'Favourites',
            iconClass: 'fill-none' as const,
          },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-4 py-5 text-center shadow-sm"
          >
            <item.icon className={cn('h-6 w-6 text-primary', item.iconClass)} />
            <span className="text-xl font-bold tabular-nums text-foreground">{item.value}</span>
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Favourite reels</h3>
          <span className="text-xs text-muted-foreground text-right shrink-0">
            <span className="tabular-nums">{favStat.toLocaleString()}</span> saved
            {favListTruncated ? (
              <span className="text-muted-foreground/85">
                {' '}
                · first {favouriteReels.length.toLocaleString()} shown
              </span>
            ) : null}
          </span>
        </div>
        {favouriteReels.length === 0 ? (
          <p className="text-sm text-muted-foreground">No favourite reels yet.</p>
        ) : (
          <div
            className={cn(
              'flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sm:mx-0 sm:px-0',
              'scrollbar-hide snap-x snap-mandatory sm:grid sm:grid-cols-4 sm:gap-3',
              'sm:overflow-visible sm:snap-none sm:pb-0',
            )}
          >
            {favouriteReels.map((reel) => (
              <button
                key={reel.id}
                type="button"
                onClick={() => navigate(`/reels?reel=${reel.id}`)}
                className={cn(
                  'text-left rounded-xl overflow-hidden border border-border bg-muted/20',
                  'hover:border-primary/40 transition-colors',
                  'shrink-0 w-[42vw] max-w-[160px] snap-start sm:max-w-none sm:w-auto sm:shrink',
                )}
              >
                <div className="aspect-[9/16]">
                  <img
                    src={reel.thumbnail || reel.product.image}
                    alt={reel.product.name}
                    className="w-full h-full object-cover"
                  />
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

      {onSignOutClick ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Account</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Sign out when you are finished on this device.
          </p>
          <Button type="button" variant="outline" className="w-full gap-2" onClick={onSignOutClick}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      ) : null}
    </div>
  );
}
