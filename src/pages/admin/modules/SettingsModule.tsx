import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Database, Mail, MessageSquare, QrCode, Send } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
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

function CommunicationCenter({
  communication,
  onSave,
}: {
  communication: Record<string, unknown>;
  onSave: (next: Record<string, unknown>) => Promise<void>;
}) {
  const [channel, setChannel] = useState(String(communication.channel ?? 'email'));
  const [recipientType, setRecipientType] = useState(String(communication.recipientType ?? 'customer'));
  const [subject, setSubject] = useState(String(communication.lastSubject ?? ''));
  const [message, setMessage] = useState(String(communication.lastMessage ?? ''));
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    setChannel(String(communication.channel ?? 'email'));
    setRecipientType(String(communication.recipientType ?? 'customer'));
  }, [communication]);

  const variables = ['{{customer_name}}', '{{order_id}}', '{{amount}}', '{{shop_name}}', '{{date}}', '{{tracking_id}}'];
  const insertVariable = (v: string) => setMessage((prev) => `${prev} ${v}`);
  const templates = (communication.templates as { name: string; body: string }[] | undefined) ?? [
    { name: 'Welcome', body: 'Dear {{customer_name}}, welcome to Khudra Pasal!' },
    { name: 'Order Update', body: 'Hi {{customer_name}}, your order #{{order_id}} has been shipped.' },
  ];

  const persistDraft = async () => {
    setSaveErr('');
    try {
      await onSave({
        ...communication,
        channel,
        recipientType,
        lastSubject: subject,
        lastMessage: message,
        templates,
      });
    } catch (e) {
      setSaveErr(formatApiError(e));
    }
  };

  const handleSend = async () => {
    setSending(true);
    setSent(false);
    setSaveErr('');
    try {
      const targetMap: Record<string, string> = {
        customer: 'customers',
        vendor: 'vendors',
        staff: 'admins',
        specific: 'all',
      };
      await adminApi.broadcastNotification({
        title: subject || 'Notification',
        message,
        target: targetMap[recipientType] ?? 'all',
        type: 'marketing',
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      setSaveErr(formatApiError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Communication Center</CardTitle>
          <CardDescription>Send notifications to user segments; templates are stored in site settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {['email', 'sms'].map((ch) => (
              <Button key={ch} variant={channel === ch ? 'default' : 'outline'} size="sm" onClick={() => { setChannel(ch); }} className="capitalize">
                {ch === 'email' ? <Mail className="w-4 h-4 mr-1" /> : <MessageSquare className="w-4 h-4 mr-1" />}
                {ch}
              </Button>
            ))}
          </div>
          <div>
            <Label>Recipient Type</Label>
            <Select value={recipientType} onValueChange={(v) => { setRecipientType(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">All Customers</SelectItem>
                <SelectItem value="vendor">All Vendors</SelectItem>
                <SelectItem value="staff">All Staff</SelectItem>
                <SelectItem value="specific">Broadcast (all)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {channel === 'email' && (
            <div><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" /></div>
          )}
          <div>
            <Label className="text-xs">Quick Templates</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {templates.map((t) => (
                <Button key={t.name} variant="outline" size="sm" className="text-xs" type="button" onClick={() => { setMessage(t.body); if (channel === 'email') setSubject(t.name); }}>
                  {t.name}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message body" />
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-xs text-muted-foreground mr-1">Variables:</span>
              {variables.map((v) => (
                <Button key={v} variant="ghost" size="sm" className="h-6 text-[10px] font-mono px-1.5" type="button" onClick={() => insertVariable(v)}>
                  {v}
                </Button>
              ))}
            </div>
          </div>
          {saveErr ? <p className="text-sm text-destructive">{saveErr}</p> : null}
          <div className="flex gap-2 flex-wrap">
            <Button type="button" onClick={() => { void persistDraft(); }} variant="outline">Save draft & templates</Button>
            <Button type="button" onClick={() => { void handleSend(); }} disabled={!message || sending} className="flex-1">
              {sending ? 'Sending…' : sent ? 'Sent!' : <><Send className="w-4 h-4 mr-1" /> Send broadcast</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('general');
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);

  const { data: adminProfile } = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: () => adminApi.profile(),
    retry: false,
  });

  const isSuperAdmin =
    Boolean(adminProfile?.is_superuser) || adminProfile?.role === 'super_admin';

  const { data: site, isLoading, isError } = useQuery({
    queryKey: ['admin', 'site-settings'],
    queryFn: () => adminApi.siteSettings(),
  });

  const { data: gwData } = useQuery({
    queryKey: ['admin', 'payment-gateways'],
    queryFn: () => adminApi.paymentGateways(),
  });

  const { data: cleanupData, error: cleanupErr, isLoading: cleanupLoading } = useQuery({
    queryKey: ['admin', 'cleanup-modules'],
    queryFn: () => adminApi.cleanupModules(),
    enabled: tab === 'clean-db' && isSuperAdmin,
    retry: false,
  });

  const cleanupModules = cleanupData?.modules ?? [];

  const cleanupMutation = useMutation({
    mutationFn: (module_ids: string[]) => adminApi.cleanupExecute(module_ids),
    onSuccess: async () => {
      setSelectedModuleIds([]);
      toast.success('Database cleanup completed.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cleanup-modules'] });
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await queryClient.invalidateQueries({ queryKey: ['super-admin-summary'] });
    },
    onError: (e: unknown) => {
      toast.error(formatApiError(e));
    },
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
  const appearance = extras.appearance ?? EMPTY_EXTRAS_SECTION;
  const emailCfg = extras.email ?? EMPTY_EXTRAS_SECTION;
  const socialCfg = extras.social ?? EMPTY_EXTRAS_SECTION;
  const envCfg = extras.environment ?? EMPTY_EXTRAS_SECTION;
  const systemCfg = extras.system ?? EMPTY_EXTRAS_SECTION;

  const [fbPixel, setFbPixel] = useState({ enabled: true, id: '', gtm: '', ga4: '', ga4Enabled: false });
  useEffect(() => {
    setFbPixel({
      enabled: analytics.fbEnabled !== false,
      id: String(analytics.pixelId ?? ''),
      gtm: String(analytics.gtmId ?? ''),
      ga4: String(analytics.ga4Id ?? ''),
      ga4Enabled: !!analytics.ga4Enabled,
    });
  }, [analytics]);

  const [appearanceState, setAppearanceState] = useState({
    logoUrl: '', faviconUrl: '', primary: '#F59E0B', secondary: '#6B21A8', footerBg: '#1E293B',
  });
  useEffect(() => {
    setAppearanceState({
      logoUrl: String(appearance.logoUrl ?? ''),
      faviconUrl: String(appearance.faviconUrl ?? ''),
      primary: String(appearance.primary ?? '#F59E0B'),
      secondary: String(appearance.secondary ?? '#6B21A8'),
      footerBg: String(appearance.footerBg ?? '#1E293B'),
    });
  }, [appearance]);

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

  const [envState, setEnvState] = useState({ appUrl: '', appMode: 'live' });
  useEffect(() => {
    setEnvState({
      appUrl: String(envCfg.appUrl ?? ''),
      appMode: String(envCfg.appMode ?? 'live'),
    });
  }, [envCfg]);

  const [systemNote, setSystemNote] = useState('');
  useEffect(() => {
    setSystemNote(String(systemCfg.note ?? ''));
  }, [systemCfg]);

  useEffect(() => {
    if (tab === 'clean-db' && adminProfile && !isSuperAdmin) {
      setTab('general');
    }
  }, [tab, adminProfile, isSuperAdmin]);

  const toggleModule = (id: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

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
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="reels">Reels</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          {isSuperAdmin ? <TabsTrigger value="clean-db">Clean Database</TabsTrigger> : null}
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
              <CardHeader><CardTitle>Facebook Pixel & tags</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium text-sm">Enable Facebook Pixel</span>
                  <Switch checked={fbPixel.enabled} onCheckedChange={(v) => setFbPixel((p) => ({ ...p, enabled: v }))} />
                </div>
                <div><Label>Pixel ID</Label><Input className="font-mono" value={fbPixel.id} onChange={(e) => setFbPixel((p) => ({ ...p, id: e.target.value }))} /></div>
                <div><Label>GTM Container ID</Label><Input className="font-mono" value={fbPixel.gtm} onChange={(e) => setFbPixel((p) => ({ ...p, gtm: e.target.value }))} /></div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium text-sm">Google Analytics 4</span>
                  <Switch checked={fbPixel.ga4Enabled} onCheckedChange={(v) => setFbPixel((p) => ({ ...p, ga4Enabled: v }))} />
                </div>
                <div><Label>GA4 Measurement ID</Label><Input className="font-mono" value={fbPixel.ga4} onChange={(e) => setFbPixel((p) => ({ ...p, ga4: e.target.value }))} /></div>
                <Button type="button" onClick={() => void saveExtrasSection('analytics', { ...analytics, fbEnabled: fbPixel.enabled, pixelId: fbPixel.id, gtmId: fbPixel.gtm, ga4Id: fbPixel.ga4, ga4Enabled: fbPixel.ga4Enabled })}>Save analytics</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader><CardTitle>Appearance & Branding</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Logo URL</Label><Input value={appearanceState.logoUrl} onChange={(e) => setAppearanceState((s) => ({ ...s, logoUrl: e.target.value }))} /></div>
                <div><Label>Favicon URL</Label><Input value={appearanceState.faviconUrl} onChange={(e) => setAppearanceState((s) => ({ ...s, faviconUrl: e.target.value }))} /></div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div><Label>Primary</Label><Input value={appearanceState.primary} onChange={(e) => setAppearanceState((s) => ({ ...s, primary: e.target.value }))} /></div>
                <div><Label>Secondary</Label><Input value={appearanceState.secondary} onChange={(e) => setAppearanceState((s) => ({ ...s, secondary: e.target.value }))} /></div>
                <div><Label>Footer background</Label><Input value={appearanceState.footerBg} onChange={(e) => setAppearanceState((s) => ({ ...s, footerBg: e.target.value }))} /></div>
              </div>
              <Button type="button" onClick={() => void saveExtrasSection('appearance', { ...appearance, ...appearanceState })}>Save appearance</Button>
            </CardContent>
          </Card>
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

        <TabsContent value="communication">
          <CommunicationCenter
            communication={(extras.communication as Record<string, unknown>) ?? EMPTY_EXTRAS_SECTION}
            onSave={async (next) => { await saveExtrasSection('communication', next); }}
          />
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

        <TabsContent value="environment">
          <Card>
            <CardHeader><CardTitle>Environment</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Public app URL</Label><Input value={envState.appUrl} onChange={(e) => setEnvState((s) => ({ ...s, appUrl: e.target.value }))} placeholder="https://…" /></div>
                <div><Label>App mode (label)</Label>
                  <Select value={envState.appMode} onValueChange={(v) => setEnvState((s) => ({ ...s, appMode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="debug">Debug</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" onClick={() => void saveExtrasSection('environment', { ...envCfg, ...envState })}>Save environment</Button>
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

        {isSuperAdmin ? (
          <TabsContent value="clean-db">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" /> Clean database
                </CardTitle>
                <CardDescription>
                  <span className="text-destructive font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Super admin only. Deletes selected operational data permanently. User accounts and staff data are never available here.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cleanupErr ? (
                  <p className="text-sm text-destructive">{formatApiError(cleanupErr)}</p>
                ) : null}
                {cleanupLoading ? (
                  <p className="text-sm text-muted-foreground">Loading cleanup modules…</p>
                ) : null}
                {!cleanupLoading && !cleanupErr ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={
                            cleanupModules.length > 0 &&
                            selectedModuleIds.length === cleanupModules.length
                          }
                          onCheckedChange={(c) => {
                            if (c) {
                              setSelectedModuleIds(cleanupModules.map((m) => m.id));
                            } else {
                              setSelectedModuleIds([]);
                            }
                          }}
                        />
                        <span className="text-sm font-medium">
                          Select all ({selectedModuleIds.length}/{cleanupModules.length})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={
                          selectedModuleIds.length === 0 ||
                          cleanupMutation.isPending ||
                          cleanupLoading
                        }
                        onClick={() => setCleanupConfirmOpen(true)}
                      >
                        Delete selected data
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                      {cleanupModules.map((mod) => (
                        <div
                          key={mod.id}
                          className="flex gap-3 p-3 border rounded-lg hover:bg-muted/30 cursor-pointer text-left"
                          onClick={() => toggleModule(mod.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleModule(mod.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <Checkbox
                            checked={selectedModuleIds.includes(mod.id)}
                            className="mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => toggleModule(mod.id)}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium leading-tight">{mod.label}</span>
                              <Badge variant="secondary" className="text-[10px] shrink-0">
                                ~{mod.approximate_row_count}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{mod.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                <AlertDialog open={cleanupConfirmOpen} onOpenChange={setCleanupConfirmOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        Confirm database cleanup
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3 text-left text-sm text-muted-foreground">
                          <p>
                            This cannot be undone. The following modules will be cleared in a safe order:
                          </p>
                          <ul className="list-disc pl-5 space-y-1 text-foreground">
                            {selectedModuleIds.map((id) => {
                              const m = cleanupModules.find((x) => x.id === id);
                              return <li key={id}>{m?.label ?? id}</li>;
                            })}
                          </ul>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={cleanupMutation.isPending}>Cancel</AlertDialogCancel>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={cleanupMutation.isPending}
                        onClick={() => {
                          cleanupMutation.mutate(selectedModuleIds, {
                            onSettled: () => setCleanupConfirmOpen(false),
                          });
                        }}
                      >
                        {cleanupMutation.isPending ? 'Deleting…' : 'Delete permanently'}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
