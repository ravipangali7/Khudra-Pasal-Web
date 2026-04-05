import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { vendorApi } from '@/lib/api';
import { toast } from 'sonner';

export default function VendorSettingsModule() {
  const qc = useQueryClient();
  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsError,
  } = useQuery({ queryKey: ['vendor', 'settings'], queryFn: () => vendorApi.settings() });
  const { data: bank, isLoading: bankLoading, isError: bankError } = useQuery({
    queryKey: ['vendor', 'bank'],
    queryFn: () => vendorApi.bankDetail(),
  });

  const [emailN, setEmailN] = useState(true);
  const [smsN, setSmsN] = useState(false);
  const [lang, setLang] = useState('en');
  const [bankName, setBankName] = useState('');
  const [acct, setAcct] = useState('');
  const [holder, setHolder] = useState('');
  const [esewa, setEsewa] = useState('');
  const [khalti, setKhalti] = useState('');
  const generalDirtyRef = useRef(false);
  const bankDirtyRef = useRef(false);
  const [generalDirty, setGeneralDirty] = useState(false);
  const [bankDirty, setBankDirty] = useState(false);

  const markGeneralDirty = () => {
    if (!generalDirtyRef.current) {
      generalDirtyRef.current = true;
      setGeneralDirty(true);
    }
  };
  const markBankDirty = () => {
    if (!bankDirtyRef.current) {
      bankDirtyRef.current = true;
      setBankDirty(true);
    }
  };

  useEffect(() => {
    if (!settings) return;
    if (!generalDirtyRef.current) {
      setEmailN(Boolean(settings.email_notifications));
      setSmsN(Boolean(settings.sms_notifications));
      setLang(String(settings.language || 'en'));
    }
  }, [settings]);

  useEffect(() => {
    if (!bank) return;
    if (!bankDirtyRef.current) {
      setBankName(String(bank.bank_name ?? ''));
      setAcct(String(bank.account_number ?? ''));
      setHolder(String(bank.account_holder ?? ''));
      setEsewa(String(bank.esewa_id ?? ''));
      setKhalti(String(bank.khalti_id ?? ''));
    }
  }, [bank]);

  const saveGeneral = useMutation({
    mutationFn: () =>
      vendorApi.updateSettings({
        email_notifications: emailN,
        sms_notifications: smsN,
        language: lang,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'settings'] });
      toast.success('Settings saved');
      generalDirtyRef.current = false;
      setGeneralDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveBank = useMutation({
    mutationFn: () =>
      vendorApi.updateBankDetail({
        bank_name: bankName,
        account_number: acct,
        account_holder: holder,
        esewa_id: esewa,
        khalti_id: khalti,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor', 'bank'] });
      toast.success('Bank details saved');
      bankDirtyRef.current = false;
      setBankDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 lg:p-6 w-full max-w-none">
      {(settingsLoading || bankLoading) && !settings && !bank ? (
        <div className="p-6 text-muted-foreground">Loading settings…</div>
      ) : null}
      {settingsError ? (
        <div className="p-6 text-destructive">Could not load settings.</div>
      ) : null}
      {bankError ? (
        <div className="p-6 text-destructive">Could not load bank details.</div>
      ) : null}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="w-full focus-visible:outline-none">
          <Card className="w-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 w-full max-w-none">
              <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">Email Notifications</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Receive order &amp; update emails</p>
                </div>
                <Switch
                  checked={emailN}
                  onCheckedChange={(v) => {
                    markGeneralDirty();
                    setEmailN(v);
                  }}
                  className="shrink-0"
                />
              </div>
              <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-4 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Receive SMS for orders</p>
                </div>
                <Switch
                  checked={smsN}
                  onCheckedChange={(v) => {
                    markGeneralDirty();
                    setSmsN(v);
                  }}
                  className="shrink-0"
                />
              </div>
              <div className="w-full space-y-2">
                <Label className="text-sm font-medium text-foreground">Language</Label>
                <Select
                  value={lang}
                  onValueChange={(v) => {
                    markGeneralDirty();
                    setLang(v);
                  }}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-border">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ne">नेपाली</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="mt-2" onClick={() => saveGeneral.mutate()} disabled={saveGeneral.isPending || !generalDirty}>
                {saveGeneral.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="w-full focus-visible:outline-none">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Bank & wallets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Bank name</Label>
                <Input
                  value={bankName}
                  onChange={(e) => {
                    markBankDirty();
                    setBankName(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label>Account number</Label>
                <Input
                  value={acct}
                  onChange={(e) => {
                    markBankDirty();
                    setAcct(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label>Account holder</Label>
                <Input
                  value={holder}
                  onChange={(e) => {
                    markBankDirty();
                    setHolder(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label>eSewa ID</Label>
                <Input
                  value={esewa}
                  onChange={(e) => {
                    markBankDirty();
                    setEsewa(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label>Khalti ID</Label>
                <Input
                  value={khalti}
                  onChange={(e) => {
                    markBankDirty();
                    setKhalti(e.target.value);
                  }}
                />
              </div>
              <Button onClick={() => saveBank.mutate()} disabled={saveBank.isPending || !bankDirty}>
                {saveBank.isPending ? 'Saving…' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
