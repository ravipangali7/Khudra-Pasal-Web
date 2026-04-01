import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { adminApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AccountProfileModule() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: () => adminApi.profile(),
    retry: false,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setEmail(data.email ?? "");
    setPhone(data.phone ?? "");
    setAddress(data.address ?? "");
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setAvatarPreview(data.avatar_url || null);
  }, [data]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const saveProfile = useMutation({
    mutationFn: (fd: FormData) => adminApi.updateProfile(fd),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Profile saved");
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", name);
    fd.append("email", email);
    fd.append("phone", phone);
    fd.append("address", address);
    const f = fileRef.current?.files?.[0];
    if (f) fd.append("avatar", f);
    saveProfile.mutate(fd);
  };

  const employee = data?.employee;

  if (isLoading && !data) {
    return <div className="p-6 text-muted-foreground">Loading profile…</div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your name, contact information, and photo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitProfile} className="space-y-6">
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
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 rounded-full overflow-hidden border border-border bg-muted shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                    —
                  </div>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                <Camera className="h-4 w-4" />
                Change photo
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>

            {employee ? (
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm space-y-1">
                <p className="font-medium text-foreground">Employee record</p>
                <p className="text-muted-foreground">
                  Role: <span className="text-foreground">{employee.role_name || "—"}</span>
                </p>
                <p className="text-muted-foreground">
                  Status: <span className="text-foreground">{employee.status}</span>
                </p>
              </div>
            ) : null}

            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
