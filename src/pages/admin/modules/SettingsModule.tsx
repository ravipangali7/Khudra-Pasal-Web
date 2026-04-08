import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { QrCode } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminMutation } from '../hooks/useAdminMutation';
import { formatApiError, resolveMediaUrl } from '../hooks/adminFormUtils';

type AdminExtras = Record<string, Record<string, unknown>>;

function deepExtras(raw: unknown): AdminExtras {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  const out: AdminExtras = {};
  for (const [k, v] of Object.entries(o)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  }
  return out;
}

/** Stable fallback so `useEffect(..., [cfg])` deps do not change every render when a section is absent. */
const EMPTY_EXTRAS_SECTION: Record<string, unknown> = {};

function ReelsSettingsPanel({
  reels,
  onSave,
}: {
  reels: Record<string, unknown>;
  onSave: (next: Record<string, unknown>) => Promise<void>;
}) {
  const [std, setStd] = useState(String(reels.standardMultiplier ?? '2'));
  const [prem, setPrem] = useState(String(reels.premiumMultiplier ?? '5'));
  const [mega, setMega] = useState(String(reels.megaMultiplier ?? '10'));
  const [feedAlgo, setFeedAlgo] = useState(String(reels.feedAlgorithm ?? 'mixed'));
  const [err, setErr] = useState('');
  useEffect(() => {
    setStd(String(reels.standardMultiplier ?? '2'));
    setPrem(String(reels.premiumMultiplier ?? '5'));
    setMega(String(reels.megaMultiplier ?? '10'));
    setFeedAlgo(String(reels.feedAlgorithm ?? 'mixed'));
  }, [reels]);

  const save = async () => {
    setErr('');
    try {
      await onSave({
        ...reels,
        standardMultiplier: parseFloat(std) || 2,
        premiumMultiplier: parseFloat(prem) || 5,
        megaMultiplier: parseFloat(mega) || 10,
        feedAlgorithm: feedAlgo,
      });
    } catch (e) {
      setErr(formatApiError(e));
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>KhudraReels Settings</CardTitle><CardDescription>Boost multipliers and feed algorithm (stored in site settings).</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div><Label>Standard boost multiplier</Label><Input type="number" value={std} onChange={(e) => setStd(e.target.value)} /></div>
            <div><Label>Premium boost multiplier</Label><Input type="number" value={prem} onChange={(e) => setPrem(e.target.value)} /></div>
            <div><Label>Mega boost multiplier</Label><Input type="number" value={mega} onChange={(e) => setMega(e.target.value)} /></div>
          </div>
          <div><Label>Feed algorithm</Label>
            <Select value={feedAlgo} onValueChange={setFeedAlgo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="chronological">Chronological</SelectItem>
                <SelectItem value="popularity">By popularity</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
                <SelectItem value="personalized">Personalized</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
          <Button type="button" onClick={() => { void save(); }}>Save Reels settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsModule() {
  const [tab, setTab] = useState('general');

  const { data: site, isLoading, isError } = useQuery({
    queryKey: ['admin', 'site-settings'],
    queryFn: () => adminApi.siteSettings(),
  });

  const { data: gwData } = useQuery({
    queryKey: ['admin', 'payment-gateways'],
    queryFn: () => adminApi.paymentGateways(),
  });

  const updateSite = useAdminMutation(adminApi.updateSiteSettings, [['admin', 'site-settings']]);
  const updateGateway = useAdminMutation(
    ({ gateway, payload }: { gateway: string; payload: Record<string, unknown> }) =>
      adminApi.updatePaymentGateway(gateway, payload),
    [['admin', 'payment-gateways']],
  );

  const extras = useMemo(() => deepExtras(site?.admin_extras), [site?.admin_extras]);

  const [siteName, setSiteName] = useState('');
  const [siteEmail, setSiteEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('NPR');
  const [timezone, setTimezone] = useState('Asia/Kathmandu');
  const [siteDescription, setSiteDescription] = useState('');
  const [metaKeywords, setMetaKeywords] = useState('');
  const [footerText, setFooterText] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [tempShopClose, setTempShopClose] = useState(false);
  const [newRegistrations, setNewRegistrations] = useState(true);
  const [kycRequired, setKycRequired] = useState(true);
  const [posEnabled, setPosEnabled] = useState(true);
  const [generalErr, setGeneralErr] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!site) return;
    setSiteName(String(site.site_name ?? ''));
    setSiteEmail(String(site.site_email ?? ''));
    setPhone(String(site.phone ?? ''));
    setAddress(String(site.address ?? ''));
    setCurrency(String(site.currency ?? 'NPR'));
    setTimezone(String(site.timezone ?? 'Asia/Kathmandu'));
    setSiteDescription(String(site.site_description ?? ''));
    setMetaKeywords(String(site.meta_keywords ?? ''));
    setFooterText(String(site.footer_text ?? ''));
    setMaintenanceMode(!!site.maintenance_mode);
    setTempShopClose(!!site.temporary_shop_close);
    setNewRegistrations(site.new_registrations !== false);
    setKycRequired(site.kyc_required !== false);
    setPosEnabled(site.pos_enabled !== false);
    setGeneralErr('');
    setLogoFile(null);
  }, [site]);

  const saveGeneral = async () => {
    setGeneralErr('');
    try {
      const base = {
        site_name: siteName,
        site_email: siteEmail,
        phone,
        address,
        currency,
        timezone,
        site_description: siteDescription,
        meta_keywords: metaKeywords,
        footer_text: footerText,
        maintenance_mode: maintenanceMode,
        temporary_shop_close: tempShopClose,
        new_registrations: newRegistrations,
        kyc_required: kycRequired,
        pos_enabled: posEnabled,
      };
      if (logoFile) {
        const fd = new FormData();
        Object.entries(base).forEach(([k, v]) => {
          fd.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v));
        });
        fd.append('site_logo', logoFile);
        await updateSite.mutateAsync(fd);
        setLogoFile(null);
      } else {
        await updateSite.mutateAsync(base);
      }
    } catch (e) {
      setGeneralErr(formatApiError(e));
    }
  };

  const saveExtrasSection = useCallback(
    async (section: string, payload: Record<string, unknown>) => {
      await updateSite.mutateAsync({ admin_extras: { [section]: payload } });
    },
    [updateSite],
  );

  const analytics = extras.analytics ?? EMPTY_EXTRAS_SECTION;
  const emailCfg = extras.email ?? EMPTY_EXTRAS_SECTION;
  const socialCfg = extras.social ?? EMPTY_EXTRAS_SECTION;
  const systemCfg = extras.system ?? EMPTY_EXTRAS_SECTION;

  const [googleAnalyticsScript, setGoogleAnalyticsScript] = useState('');
  useEffect(() => {
    setGoogleAnalyticsScript(String(analytics.google_analytics_script ?? ''));
  }, [analytics]);

  const [emailState, setEmailState] = useState({
    smtpHost: '', smtpPort: '587', user: '', password: '', fromName: '', fromEmail: '', failover: false,
  });
  useEffect(() => {
    setEmailState({
      smtpHost: String(emailCfg.smtpHost ?? ''),
      smtpPort: String(emailCfg.smtpPort ?? '587'),
      user: String(emailCfg.user ?? ''),
      password: String(emailCfg.password ?? ''),
      fromName: String(emailCfg.fromName ?? 'Khudra Pasal'),
      fromEmail: String(emailCfg.fromEmail ?? ''),
      failover: !!emailCfg.failover,
    });
  }, [emailCfg]);

  const [socialState, setSocialState] = useState({
    facebook: '', instagram: '', twitter: '', youtube: '', tiktok: '',
  });
  useEffect(() => {
    setSocialState({
      facebook: String(socialCfg.facebook ?? ''),
      instagram: String(socialCfg.instagram ?? ''),
      twitter: String(socialCfg.twitter ?? ''),
      youtube: String(socialCfg.youtube ?? ''),
      tiktok: String(socialCfg.tiktok ?? ''),
    });
  }, [socialCfg]);

  const [systemNote, setSystemNote] = useState('');
  useEffect(() => {
    setSystemNote(String(systemCfg.note ?? ''));
  }, [systemCfg]);

  if (isLoading) {
    return <div className="p-4 lg:p-6 text-sm text-muted-foreground">Loading settings…</div>;
  }
  if (isError || !site) {
    return <div className="p-4 lg:p-6 text-sm text-destructive">Could not load settings.</div>;
  }

  return (
    <div className="p-4 lg:p-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="reels">Reels</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle>General Settings</CardTitle><CardDescription>Site information and configuration</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {generalErr ? <p className="text-sm text-destructive">{generalErr}</p> : null}
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Site Name</Label><Input value={siteName} onChange={(e) => setSiteName(e.target.value)} /></div>
                <div><Label>Site Email</Label><Input value={siteEmail} onChange={(e) => setSiteEmail(e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                <div><Label>Currency</Label>
                  <Select value={currency.toLowerCase()} onValueChange={(v) => setCurrency(v.toUpperCase())}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="npr">NPR</SelectItem>
                      <SelectItem value="usd">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kathmandu">Asia/Kathmandu</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Invoice / branding logo</Label>
                <div className="flex flex-wrap items-center gap-4">
                  {site?.site_logo_url ? (
                    <img src={resolveMediaUrl(String(site.site_logo_url))} alt="" className="h-16 max-w-[200px] object-contain border rounded-md p-1 bg-muted/30" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No logo uploaded</span>
                  )}
                  <Input type="file" accept="image/*" className="max-w-xs cursor-pointer" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                </div>
                {logoFile ? <p className="text-xs text-muted-foreground">New file selected — save to apply.</p> : null}
              </div>
              <div><Label>Site Description</Label><Textarea value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} rows={3} /></div>
              <div><Label>Meta Keywords</Label><Input value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} /></div>
              <div><Label>Footer Text</Label><Input value={footerText} onChange={(e) => setFooterText(e.target.value)} /></div>
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium text-sm">System Controls</h4>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-sm">Maintenance Mode</p><p className="text-xs text-muted-foreground">Disable user access temporarily</p></div>
                  <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-sm">Temporary Shop Close</p><p className="text-xs text-muted-foreground">Pause all orders temporarily</p></div>
                  <Switch checked={tempShopClose} onCheckedChange={setTempShopClose} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-sm">New Registrations</p><p className="text-xs text-muted-foreground">Allow new user signups</p></div>
                  <Switch checked={newRegistrations} onCheckedChange={setNewRegistrations} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-sm">KYC Required</p><p className="text-xs text-muted-foreground">Require KYC for account leaders</p></div>
                  <Switch checked={kycRequired} onCheckedChange={setKycRequired} />
                </div>
                <div className="flex items-center justify-between">
                  <div><p className="font-medium text-sm">POS System Enabled</p><p className="text-xs text-muted-foreground">Enable point-of-sale module</p></div>
                  <Switch checked={posEnabled} onCheckedChange={setPosEnabled} />
                </div>
              </div>
              <Button type="button" onClick={() => { void saveGeneral(); }} disabled={updateSite.isPending}>
                {updateSite.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Google Analytics</CardTitle>
                <CardDescription>Paste your tracking snippet (for example the gtag.js block from Google Analytics).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="google-analytics-script">Google Analytics script</Label>
                  <Textarea
                    id="google-analytics-script"
                    className="mt-2 font-mono text-sm"
                    rows={10}
                    value={googleAnalyticsScript}
                    onChange={(e) => setGoogleAnalyticsScript(e.target.value)}
                    placeholder="<!-- Paste script tags here -->"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() =>
                    void saveExtrasSection('analytics', { ...analytics, google_analytics_script: googleAnalyticsScript })
                  }
                  disabled={updateSite.isPending}
                >
                  {updateSite.isPending ? 'Saving…' : 'Save analytics'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader><CardTitle>Email Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>SMTP Host</Label><Input value={emailState.smtpHost} onChange={(e) => setEmailState((s) => ({ ...s, smtpHost: e.target.value }))} /></div>
                <div><Label>SMTP Port</Label><Input value={emailState.smtpPort} onChange={(e) => setEmailState((s) => ({ ...s, smtpPort: e.target.value }))} /></div>
                <div><Label>Username</Label><Input value={emailState.user} onChange={(e) => setEmailState((s) => ({ ...s, user: e.target.value }))} /></div>
                <div><Label>Password</Label><Input type="password" value={emailState.password} onChange={(e) => setEmailState((s) => ({ ...s, password: e.target.value }))} /></div>
                <div><Label>From Name</Label><Input value={emailState.fromName} onChange={(e) => setEmailState((s) => ({ ...s, fromName: e.target.value }))} /></div>
                <div><Label>From Email</Label><Input value={emailState.fromEmail} onChange={(e) => setEmailState((s) => ({ ...s, fromEmail: e.target.value }))} /></div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium text-sm">Email failover</span>
                <Switch checked={emailState.failover} onCheckedChange={(v) => setEmailState((s) => ({ ...s, failover: v }))} />
              </div>
              <Button type="button" onClick={() => void saveExtrasSection('email', { ...emailCfg, ...emailState })}>Save SMTP settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reels">
          <ReelsSettingsPanel
            reels={(extras.reels as Record<string, unknown>) ?? EMPTY_EXTRAS_SECTION}
            onSave={async (next) => { await saveExtrasSection('reels', next); }}
          />
        </TabsContent>

        <TabsContent value="payment">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Payment Gateways</CardTitle><CardDescription>Keys and environment (stored in database).</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {(gwData?.results ?? []).map((gw) => (
                  <div key={String(gw.gateway)} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{String(gw.label ?? gw.gateway)}</span>
                      <Switch
                        checked={!!gw.is_enabled}
                        onCheckedChange={(checked) => {
                          void updateGateway.mutateAsync({ gateway: String(gw.gateway), payload: { is_enabled: checked } });
                        }}
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div><Label>Environment</Label>
                        <Select
                          value={String(gw.environment ?? 'test')}
                          onValueChange={(v) => {
                            void updateGateway.mutateAsync({ gateway: String(gw.gateway), payload: { environment: v } });
                          }}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="test">Test</SelectItem>
                            <SelectItem value="sandbox">Sandbox</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Merchant ID</Label><Input className="font-mono text-xs" defaultValue={String(gw.merchant_id ?? '')} onBlur={(e) => {
                        void updateGateway.mutateAsync({ gateway: String(gw.gateway), payload: { merchant_id: e.target.value } });
                      }} />
                      </div>
                      <div><Label>API key (test)</Label><Input type="password" className="font-mono text-xs" placeholder="••••" defaultValue={String(gw.api_key_test ?? '')} onBlur={(e) => {
                        void updateGateway.mutateAsync({ gateway: String(gw.gateway), payload: { api_key_test: e.target.value } });
                      }} />
                      </div>
                      <div><Label>API key (live)</Label><Input type="password" className="font-mono text-xs" placeholder="••••" defaultValue={String(gw.api_key_live ?? '')} onBlur={(e) => {
                        void updateGateway.mutateAsync({ gateway: String(gw.gateway), payload: { api_key_live: e.target.value } });
                      }} />
                      </div>
                      <div className="md:col-span-2"><Label>Callback URL</Label><Input className="font-mono text-xs" defaultValue={String(gw.callback_url ?? '')} onBlur={(e) => {
                        void updateGateway.mutateAsync({ gateway: String(gw.gateway), payload: { callback_url: e.target.value } });
                      }} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5" /> NCHL QR</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                Configure the <strong className="text-foreground">nchl_qr</strong> gateway above (keys, QR expiry). Certificate upload can be added via Django admin if needed.
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader><CardTitle>Social Media</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(['facebook', 'instagram', 'twitter', 'youtube', 'tiktok'] as const).map((k) => (
                <div key={k}><Label className="capitalize">{k}</Label><Input value={socialState[k]} onChange={(e) => setSocialState((s) => ({ ...s, [k]: e.target.value }))} placeholder={`https://…`} /></div>
              ))}
              <Button type="button" onClick={() => void saveExtrasSection('social', { ...socialCfg, ...socialState })}>Save social links</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader><CardTitle>System notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea rows={4} value={systemNote} onChange={(e) => setSystemNote(e.target.value)} placeholder="Internal notes (stored in admin_extras.system)" />
              <Button type="button" onClick={() => void saveExtrasSection('system', { ...systemCfg, note: systemNote })}>Save system notes</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
