import { useEffect, useMemo, useState } from "react";
import { Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { appPromotionBannerStyle } from "@/lib/appPromotionBanner";
import type { WebsiteAppPromotionBanner } from "@/lib/api";
import { formatApiError } from "../hooks/adminFormUtils";

export type AppPromotionBannerForm = {
  headline: string;
  subline: string;
  cta_label: string;
  store_url: string;
  gradient_from: string;
  gradient_to: string;
};

const EMPTY_FORM: AppPromotionBannerForm = {
  headline: "",
  subline: "",
  cta_label: "Get app",
  store_url: "",
  gradient_from: "",
  gradient_to: "",
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
    </div>
  );
}
