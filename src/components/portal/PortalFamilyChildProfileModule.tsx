import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Lock, LogOut } from 'lucide-react';
import { portalApi, type PortalSelfProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type Props = {
  variant: 'family' | 'child';
  onLogoutClick?: () => void;
};

export default function PortalFamilyChildProfileModule({ variant, onLogoutClick }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'self-profile'],
    queryFn: () => portalApi.selfProfile(),
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [oldP, setOldP] = useState('');
  const [newP, setNewP] = useState('');
  const [newP2, setNewP2] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (!data) return;
    const d = data as PortalSelfProfile;
    setName(String(d.name ?? ''));
    setEmail(String(d.email ?? ''));
    setPhone(String(d.phone ?? ''));
    setAddress(String(d.address ?? ''));
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const url = d.logo_url || d.avatar_url;
    setAvatarPreview(url ? String(url) : null);
  }, [data]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const saveMut = useMutation({
    mutationFn: (fd: FormData) => portalApi.updateSelfProfile(fd),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['portal'] });
      toast.success('Profile saved');
      if (fileRef.current) fileRef.current.value = '';
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pwdMut = useMutation({
    mutationFn: () => portalApi.changePassword(oldP, newP),
    onSuccess: () => {
      toast.success('Password updated');
      setOldP('');
      setNewP('');
      setNewP2('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', name);
    fd.append('email', email);
    fd.append('phone', phone);
    fd.append('address', address);
    const f = fileRef.current?.files?.[0];
    if (f) fd.append('avatar', f);
    saveMut.mutate(fd);
  };

  const d = data as PortalSelfProfile | undefined;

  if (isLoading && !data) {
    return <div className="p-6 text-muted-foreground">Loading profile…</div>;
  }

  const title = variant === 'family' ? 'Family portal profile' : 'My profile';

  return (
    <div className="p-4 lg:p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Keep your profile and security details up to date.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card className="border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>Your account information on KhudraPasal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-6">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-hidden
                onChange={(ev) => {
                  const f = ev.target.files?.[0];
                  if (f) {
                    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
                    const url = URL.createObjectURL(f);
                    objectUrlRef.current = url;
                    setAvatarPreview(url);
                  }
                }}
              />
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">—</div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{name || 'Account photo'}</p>
                    <p className="text-xs text-muted-foreground">PNG or JPG up to your system limit.</p>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                  <Camera className="h-4 w-4" />
                  Change photo
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>

              {d?.family_group_name != null && d.family_group_name !== '' ? (
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm space-y-2">
                  <p className="font-medium text-foreground">Family</p>
                  <p className="text-muted-foreground">
                    Group: <span className="text-foreground">{d.family_group_name}</span>
                  </p>
                  {d.family_member_role ? (
                    <p className="text-muted-foreground">
                      Your role: <span className="text-foreground">{d.family_member_role}</span>
                    </p>
                  ) : null}
                  {typeof d.spending_limit_monthly === 'number' ? (
                    <p className="text-muted-foreground">
                      Monthly spending limit (set by parent):{' '}
                      <span className="text-foreground">Rs. {d.spending_limit_monthly.toLocaleString()}</span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? 'Saving…' : 'Save profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit border-primary/10 shadow-sm">
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and current sign-in session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              variant={showPasswordForm ? 'secondary' : 'default'}
              className="w-full justify-start gap-2"
              onClick={() => setShowPasswordForm((v) => !v)}
            >
              <Lock className="h-4 w-4" />
              {showPasswordForm ? 'Hide Change Password' : 'Change Password'}
            </Button>

            {showPasswordForm ? (
              <div className="space-y-3 rounded-xl border border-border p-4">
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
              </div>
            ) : null}

            {onLogoutClick ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start gap-2 text-destructive">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out of this device?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be logged out from your family portal session on this browser.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onLogoutClick}>Logout</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
