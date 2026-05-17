import { useEffect, useMemo, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appPromotionBannerStyle } from "@/lib/appPromotionBanner";
import { adminApi, type WebsiteAppPromotionBanner } from "@/lib/api";
import { formatApiError } from "../hooks/adminFormUtils";

export type AppPromotionBannerForm = {
  headline: string;
  subline: string;
  cta_label: string;
  store_url: string;
  gradient_from: string;
  gradient_to: string;
  discount_percent: string;
};

const EMPTY_FORM: AppPromotionBannerForm = {
  headline: "",
  subline: "",
  cta_label: "Get app",
  store_url: "",
  gradient_from: "",
  gradient_to: "",
  discount_percent: "20",
};

function formFromExtras(raw: Record<string, unknown> | undefined): AppPromotionBannerForm {
  if (!raw) return { ...EMPTY_FORM };
  return {
    headline: String(raw.headline ?? ""),
    subline: String(raw.subline ?? ""),
    cta_label: String(raw.cta_label ?? "") || "Get app",
    store_url: String(raw.store_url ?? ""),
    gradient_from: String(raw.gradient_from ?? ""),
    gradient_to: String(raw.gradient_to ?? ""),
    discount_percent: String(raw.discount_percent ?? "") || "20",
  };
}

function BannerPreview({ form }: { form: AppPromotionBannerForm }) {
  const headline = form.headline.trim();
  if (!headline) {
    return (
      <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        Add a headline and save to show the banner on the website.
      </p>
    );
  }

  const previewBanner: WebsiteAppPromotionBanner = {
    headline,
    subline: form.subline.trim() || undefined,
    cta_label: form.cta_label.trim() || "Get app",
    gradient_from: form.gradient_from.trim() || undefined,
    gradient_to: form.gradient_to.trim() || undefined,
  };
  const gradientStyle = appPromotionBannerStyle(previewBanner);
  const subline = form.subline.trim();

  return (
    <div
      className={
        gradientStyle
          ? "rounded-lg overflow-hidden text-primary-foreground shadow-md"
          : "rounded-lg overflow-hidden bg-gradient-to-r from-primary via-primary/95 to-violet-700 text-primary-foreground shadow-md"
      }
      style={gradientStyle}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 pr-1">
        <Smartphone className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight">{headline}</p>
          {subline ? <p className="text-[11px] leading-tight opacity-90">{subline}</p> : null}
        </div>
        <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-primary">
          {form.cta_label.trim() || "Get app"}
        </span>
        <span className="shrink-0 rounded-full p-1.5 opacity-60" aria-hidden>
          <X className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

export default function AppPromotionBannerPanel({
  cfg,
  onSave,
  isSaving,
}: {
  cfg: Record<string, unknown>;
  onSave: (next: Record<string, unknown>) => Promise<void>;
  isSaving: boolean;
}) {
  const initial = useMemo(() => formFromExtras(cfg), [cfg]);
  const [form, setForm] = useState<AppPromotionBannerForm>(initial);
  const [err, setErr] = useState("");

  useEffect(() => {
    setForm(formFromExtras(cfg));
    setErr("");
  }, [cfg]);

  const set = (key: keyof AppPromotionBannerForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    setErr("");
    try {
      await onSave({
        headline: form.headline.trim(),
        subline: form.subline.trim(),
        cta_label: form.cta_label.trim() || "Get app",
        store_url: form.store_url.trim(),
        gradient_from: form.gradient_from.trim(),
        gradient_to: form.gradient_to.trim(),
        discount_percent: form.discount_percent.trim(),
      });
    } catch (e) {
      setErr(formatApiError(e));
    }
  };

  const clear = async () => {
    setErr("");
    try {
      await onSave({
        headline: "",
        subline: "",
        cta_label: "",
        store_url: "",
        gradient_from: "",
        gradient_to: "",
        discount_percent: "",
      });
      setForm({ ...EMPTY_FORM });
    } catch (e) {
      setErr(formatApiError(e));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>App Promotion Banner</CardTitle>
          <CardDescription>
            Shown as a sticky bar at the top of the public website (mobile and desktop). Hidden in the
            Android app WebView. Leave the headline empty to hide the banner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Live preview</Label>
            <BannerPreview form={form} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="app-promo-headline">Headline *</Label>
              <Input
                id="app-promo-headline"
                className="mt-1.5"
                value={form.headline}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="Download the app and get 20% discount offer"
              />
              <p className="mt-1 text-xs text-muted-foreground">Required — banner appears only when this is filled.</p>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="app-promo-subline">Subtext</Label>
              <Input
                id="app-promo-subline"
                className="mt-1.5"
                value={form.subline}
                onChange={(e) => set("subline", e.target.value)}
                placeholder="Exclusive deals on Android — Install Khudra Pasal today"
              />
            </div>
            <div>
              <Label htmlFor="app-promo-cta">Button label</Label>
              <Input
                id="app-promo-cta"
                className="mt-1.5"
                value={form.cta_label}
                onChange={(e) => set("cta_label", e.target.value)}
                placeholder="Get app"
              />
            </div>
            <div>
              <Label htmlFor="app-promo-url">App store URL</Label>
              <Input
                id="app-promo-url"
                className="mt-1.5 font-mono text-sm"
                value={form.store_url}
                onChange={(e) => set("store_url", e.target.value)}
                placeholder="https://play.google.com/store/apps/details?id=…"
              />
            </div>
            <div>
              <Label htmlFor="app-promo-discount">First-order discount (%)</Label>
              <Input
                id="app-promo-discount"
                type="number"
                min={0}
                max={100}
                step={0.01}
                className="mt-1.5"
                value={form.discount_percent}
                onChange={(e) => set("discount_percent", e.target.value)}
                placeholder="20"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Applied once on the first order after the customer opens the app (install claimed).
              </p>
            </div>
            <div>
              <Label htmlFor="app-promo-from">Gradient start color</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="app-promo-from"
                  value={form.gradient_from}
                  onChange={(e) => set("gradient_from", e.target.value)}
                  placeholder="#e91e8e or hsl(330 80% 55%)"
                />
                <input
                  type="color"
                  className="h-10 w-12 shrink-0 cursor-pointer rounded border border-input bg-background p-0.5"
                  value={form.gradient_from.startsWith("#") && form.gradient_from.length >= 7 ? form.gradient_from : "#e91e8e"}
                  onChange={(e) => set("gradient_from", e.target.value)}
                  aria-label="Pick gradient start color"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="app-promo-to">Gradient end color</Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="app-promo-to"
                  value={form.gradient_to}
                  onChange={(e) => set("gradient_to", e.target.value)}
                  placeholder="#6d28d9"
                />
                <input
                  type="color"
                  className="h-10 w-12 shrink-0 cursor-pointer rounded border border-input bg-background p-0.5"
                  value={form.gradient_to.startsWith("#") && form.gradient_to.length >= 7 ? form.gradient_to : "#6d28d9"}
                  onChange={(e) => set("gradient_to", e.target.value)}
                  aria-label="Pick gradient end color"
                />
              </div>
            </div>
          </div>

          {err ? <p className="text-sm text-destructive">{err}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => { void save(); }} disabled={isSaving}>
              {isSaving ? "Saving…" : "Save banner"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { void clear(); }} disabled={isSaving}>
              Clear & hide on website
            </Button>
          </div>
        </CardContent>
      </Card>

      <AppPromoAttributionTracking />
    </div>
  );
}

function AppPromoAttributionTracking() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "app-promotion-attributions"],
    queryFn: () => adminApi.appPromotionAttributions({ limit: 100 }),
    refetchInterval: 30_000,
  });

  const summary = data?.summary;
  const rows = data?.results ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Attribution tracking</CardTitle>
          <CardDescription>
            Banner clicks, app install claims, and first-order discount redemptions.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => { void refetch(); }}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-md bg-muted px-2 py-1">Clicked: {summary.clicked}</span>
            <span className="rounded-md bg-muted px-2 py-1">Installed: {summary.installed}</span>
            <span className="rounded-md bg-muted px-2 py-1">Redeemed: {summary.redeemed}</span>
            <span className="rounded-md bg-muted px-2 py-1">Total: {summary.total}</span>
          </div>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attributions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 font-medium">Customer</th>
                  <th className="p-2 font-medium">Status</th>
                  <th className="p-2 font-medium">Discount</th>
                  <th className="p-2 font-medium">Clicked</th>
                  <th className="p-2 font-medium">Installed</th>
                  <th className="p-2 font-medium">First order</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2">
                      {r.user_name || "—"}
                      {r.user_phone ? (
                        <span className="block text-xs text-muted-foreground">{r.user_phone}</span>
                      ) : null}
                    </td>
                    <td className="p-2 capitalize">{r.status}</td>
                    <td className="p-2">{r.discount_percent}%</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.clicked_at ? new Date(r.clicked_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.installed_at ? new Date(r.installed_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-2 text-xs">{r.first_order_number || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
