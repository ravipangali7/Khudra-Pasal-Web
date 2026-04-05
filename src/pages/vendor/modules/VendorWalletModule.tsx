import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminTable from '@/components/admin/AdminTable';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PayoutAccountsManager from '@/components/wallet/PayoutAccountsManager';
import { extractResults, vendorApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatSignedVendorAmount(amount: number) {
  const abs = Math.round(Math.abs(amount));
  if (amount < 0) {
    return { text: `-Rs. ${abs.toLocaleString()}`, className: 'text-destructive' as const };
  }
  if (amount > 0) {
    return { text: `+Rs. ${abs.toLocaleString()}`, className: 'text-emerald-600' as const };
  }
  return { text: `Rs. ${abs.toLocaleString()}`, className: 'text-muted-foreground' as const };
}

function vendorTxnTypeLabel(source: string, type: string) {
  if (source === 'platform_commission') return 'Commission (Super Admin)';
  if (source === 'withdrawal_request') return 'Withdrawal';
  const human: Record<string, string> = {
    vendor_settlement: 'Sale settlement',
    withdrawal: 'Withdrawal',
    debit: 'Debit',
    credit: 'Credit',
    transfer: 'Transfer',
    topup: 'Top-up',
    purchase: 'Purchase',
    bonus: 'Bonus',
    commission_in: 'Commission',
  };
  return human[type] ?? type.replace(/_/g, ' ');
}

export default function VendorWalletModule({ activeSection }: { activeSection: string }) {
  const qc = useQueryClient();
  const { data: summary } = useQuery({
    queryKey: ['vendor', 'summary'],
    queryFn: () => vendorApi.summary(),
    refetchOnMount: 'always',
  });
  const { data: vMe } = useQuery({ queryKey: ['vendor', 'me'], queryFn: () => vendorApi.me() });
  const { data: txResp } = useQuery({
    queryKey: ['vendor', 'wallet-txns'],
    queryFn: () => vendorApi.walletTransactions({ page_size: 100 }),
    enabled: activeSection === 'transactions' || activeSection === 'wallet' || activeSection === 'earnings',
    refetchOnMount: 'always',
  });
  const { data: wdResp } = useQuery({
    queryKey: ['vendor', 'withdrawals'],
    queryFn: () => vendorApi.withdrawals({ page_size: 100 }),
    enabled: activeSection === 'withdrawals' || activeSection === 'wallet',
  });
  const { data: vendorPayouts = [], isLoading: vendorPayoutLoading } = useQuery({
    queryKey: ['vendor', 'payout-accounts'],
    queryFn: async () => (await vendorApi.payoutAccounts()).results,
    enabled: activeSection === 'withdrawals',
  });
  const transactions = useMemo(() => extractResults<Record<string, unknown>>(txResp), [txResp]);
  const withdrawals = useMemo(() => extractResults<Record<string, unknown>>(wdResp), [wdResp]);

  const [amount, setAmount] = useState('');
  const [payoutId, setPayoutId] = useState('');

  useEffect(() => {
    if (activeSection === 'withdrawals' && vendorPayouts.length && !payoutId) {
      setPayoutId(vendorPayouts[0].id);
    }
  }, [activeSection, vendorPayouts, payoutId]);

  const wdMut = useMutation({
    mutationFn: () =>
      vendorApi.createWithdrawal({
        amount: Number(amount),
        payout_account_id: payoutId,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vendor'] });
      toast.success('Withdrawal requested');
      setAmount('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const txRows = transactions.map((t) => {
    const source = String((t as { source?: string }).source ?? 'wallet');
    const typeRaw = String(t.type ?? '');
    const fund = String((t as { fund_source?: string }).fund_source ?? '').trim();
    const desc = String(t.description ?? '—');
    return {
      id: String(t.id ?? ''),
      source,
      type: typeRaw,
      typeLabel: vendorTxnTypeLabel(source, typeRaw),
      order: fund || desc,
      amount: Number(t.amount ?? 0),
      status: String(t.status ?? ''),
      date: String(t.date ?? ''),
    };
  });

  const defaultRange = useCallback(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);

  const [reportFrom, setReportFrom] = useState(() => defaultRange().from);
  const [reportTo, setReportTo] = useState(() => defaultRange().to);

  const { data: report } = useQuery({
    queryKey: ['vendor', 'reports-summary', reportFrom, reportTo],
    queryFn: () => vendorApi.reportsSummary({ from: reportFrom, to: reportTo }),
    enabled: activeSection === 'earnings',
    refetchOnMount: 'always',
  });
  const { data: settleResp } = useQuery({
    queryKey: ['vendor', 'commission-settlements', reportFrom, reportTo],
    queryFn: () => vendorApi.commissionSettlements({ page_size: 100 }),
    enabled: activeSection === 'earnings',
    refetchOnMount: 'always',
  });
  const settlements = useMemo(
    () => extractResults<Record<string, unknown>>(settleResp),
    [settleResp],
  );

  if (activeSection === 'earnings') {
    const categoryBreakdown = (report?.category_breakdown as { name?: string; value?: number }[]) ?? [];
    const daily = (report?.daily as { day?: string; sales?: number; orders?: number }[]) ?? [];
    const orderStatus = (report?.order_status as { name?: string; value?: number }[]) ?? [];
    const gross = Number(report?.gross_sales ?? 0);
    const est = Number(report?.earnings_estimate ?? 0);
    const settled = Number(report?.wallet_settled_total ?? 0);

    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-40" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-40" />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => {
            const r = defaultRange();
            setReportFrom(r.from);
            setReportTo(r.to);
          }}>
            Last 30 days
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Wallet balance</p>
              <p className="text-2xl font-bold text-primary">
                Rs. {Math.round(summary?.wallet_balance ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Gross sales (range)</p>
              <p className="text-2xl font-bold">Rs. {Math.round(gross).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Settled to wallet (range)</p>
              <p className="text-2xl font-bold text-emerald-600">Rs. {Math.round(settled).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground mt-1">After commission; matches credits</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Est. earnings (heuristic)</p>
              <p className="text-2xl font-bold text-muted-foreground">Rs. {Math.round(est).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Today sales</p>
              <p className="text-2xl font-bold">Rs. {Math.round(summary?.today_sales ?? 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Commission & order mix</CardTitle>
            <CardDescription>
              Rate{' '}
              <Badge variant="outline">
                {Number((vMe as { commission_rate?: number } | undefined)?.commission_rate ?? 0).toFixed(1)}%
              </Badge>
              {report?.from && report?.to ? (
                <span className="ml-2 text-muted-foreground">
                  Report: {String(report.from)} — {String(report.to)}
                </span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {orderStatus.map((o) => (
              <Badge key={String(o.name)} variant="secondary" className="text-xs capitalize">
                {String(o.name)}: {Number(o.value ?? 0)}
              </Badge>
            ))}
            {orderStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders in this period.</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by category</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((row) => (
                    <tr key={String(row.name)} className="border-t">
                      <td className="p-3">{String(row.name)}</td>
                      <td className="p-3 text-right tabular-nums font-medium">
                        Rs. {Math.round(Number(row.value ?? 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {categoryBreakdown.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No category data for this range.</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily sales</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">Day</th>
                    <th className="p-3 font-medium text-right">Sales</th>
                    <th className="p-3 font-medium text-right">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((row) => (
                    <tr key={String(row.day)} className="border-t">
                      <td className="p-3">{String(row.day)}</td>
                      <td className="p-3 text-right tabular-nums">Rs. {Math.round(Number(row.sales ?? 0)).toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums">{Number(row.orders ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {daily.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No daily rows for this range.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commission settlements (detail)</CardTitle>
            <CardDescription>Per paid order: your share after platform commission</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">Order</th>
                    <th className="p-3 font-medium text-right">Order total</th>
                    <th className="p-3 font-medium text-right">Commission</th>
                    <th className="p-3 font-medium text-right">Your share</th>
                    <th className="p-3 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s) => (
                    <tr key={String(s.id)} className="border-t">
                      <td className="p-3 font-medium">{String(s.order_number ?? '')}</td>
                      <td className="p-3 text-right tabular-nums">Rs. {Math.round(Number(s.total_amount ?? 0)).toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums font-medium text-destructive">
                        -Rs. {Math.round(Number(s.commission_amount ?? 0)).toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-medium text-emerald-700">
                        Rs. {Math.round(Number(s.vendor_amount ?? 0)).toLocaleString()}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                        {String(s.created_at ?? '').replace('T', ' ').slice(0, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {settlements.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No settlements recorded yet.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wallet transactions (source detail)</CardTitle>
            <CardDescription>Ledger entries tied to your vendor wallet</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-3 font-medium">ID</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Reference</th>
                    <th className="p-3 font-medium text-right">Amount</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {txRows.map((t) => {
                    const amt = formatSignedVendorAmount(t.amount);
                    return (
                    <tr key={t.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{t.id}</td>
                      <td className="p-3 capitalize">{t.typeLabel}</td>
                      <td className="p-3 max-w-[200px] truncate">{t.order}</td>
                      <td
                        className={cn(
                          'p-3 text-right tabular-nums font-medium',
                          amt.className,
                        )}
                      >
                        {amt.text}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          {t.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{t.date}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {txRows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No wallet transactions yet.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'wallet') {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-3xl font-bold text-primary">
                Rs. {Math.round(summary?.wallet_balance ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Pending payout</p>
              <p className="text-3xl font-bold">Rs. {Math.round(summary?.pending_payout ?? 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Today sales</p>
              <p className="text-3xl font-bold text-emerald-600">
                Rs. {Math.round(summary?.today_sales ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Rate:{' '}
              <Badge variant="outline">
                {Number((vMe as { commission_rate?: number } | undefined)?.commission_rate ?? 0).toFixed(1)}%
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeSection === 'withdrawals') {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Payout accounts</CardTitle>
            <CardDescription>Save eSewa, Khalti, or bank details. KYC must be verified to withdraw.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-lg">
            <PayoutAccountsManager
              accounts={vendorPayouts}
              loading={vendorPayoutLoading}
              onCreate={async (fd) => {
                await vendorApi.createPayoutAccount(fd);
                await qc.invalidateQueries({ queryKey: ['vendor', 'payout-accounts'] });
              }}
              onDelete={async (id) => {
                await vendorApi.deletePayoutAccount(id);
                await qc.invalidateQueries({ queryKey: ['vendor', 'payout-accounts'] });
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Request withdrawal</CardTitle>
            <CardDescription>Creates a pending request (balance unchanged until approved).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div>
              <Label>Payout account</Label>
              <Select value={payoutId} onValueChange={setPayoutId} disabled={vendorPayoutLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select saved account" />
                </SelectTrigger>
                <SelectContent>
                  {vendorPayouts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.type} · {a.phone || a.bank_account_no || '—'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (Rs.)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <Button
              onClick={() => wdMut.mutate()}
              disabled={wdMut.isPending || !payoutId || !amount || Number(amount) < 1}
            >
              Submit
            </Button>
          </CardContent>
        </Card>
        <AdminTable
          title="Withdrawal history"
          data={withdrawals}
          columns={[
            { key: 'id', label: 'ID' },
            {
              key: 'amount',
              label: 'Amount',
              render: (w) => (
                <span className="font-medium tabular-nums text-destructive">
                  -Rs. {Math.round(Number(w.amount)).toLocaleString()}
                </span>
              ),
            },
            { key: 'method', label: 'Method' },
            { key: 'status', label: 'Status', render: (w) => <Badge className="text-xs">{String(w.status)}</Badge> },
            { key: 'date', label: 'Date' },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <AdminTable
        title="Transactions"
        data={txRows}
        columns={[
          { key: 'id', label: 'ID', render: (t) => <span className="font-mono text-xs">{t.id}</span> },
          { key: 'typeLabel', label: 'Type' },
          { key: 'order', label: 'Reference' },
          {
            key: 'amount',
            label: 'Amount',
            render: (t) => {
              const amt = formatSignedVendorAmount(t.amount);
              return <span className={cn('font-medium tabular-nums', amt.className)}>{amt.text}</span>;
            },
          },
          { key: 'status', label: 'Status' },
          { key: 'date', label: 'Date' },
        ]}
      />
    </div>
  );
}
