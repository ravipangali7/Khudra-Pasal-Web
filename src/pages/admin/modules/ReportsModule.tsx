import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  LayoutDashboard,
  Package,
  PieChart as PieChartIcon,
  RefreshCw,
  ShoppingCart,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { ReportChartCard } from "@/components/admin/reports/ReportChartCard";
import { ReportsDataTable } from "@/components/admin/reports/ReportsDataTable";
import { ReportsFilters } from "@/components/admin/reports/ReportsFilters";
import { ReportsPageSkeleton } from "@/components/admin/reports/ReportsSkeleton";
import { ReportsStatCard } from "@/components/admin/reports/ReportsStatCard";
import {
  CHART_PALETTE,
  CHART_PRIMARY,
  CHART_SECONDARY,
  chartAxisTick,
  chartTooltipStyle,
} from "@/components/admin/reports/reportsChartTheme";
import { downloadCsv, rowsToCsv } from "@/components/admin/reports/reportsCsv";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi, extractResults, type AdminOrderListRow, type AdminReportsSnapshot } from "@/lib/api";
import { useAdminList } from "../hooks/useAdminList";

function fmtRs(n: number) {
  if (!Number.isFinite(n)) return "Rs. 0";
  if (n >= 1_000_000) return `Rs. ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `Rs. ${(n / 1000).toFixed(0)}K`;
  return `Rs. ${n.toFixed(0)}`;
}

function defaultRange(): DateRange {
  const to = new Date();
  const from = subDays(to, 6);
  return { from, to };
}

function snapshotQueryParams(
  dateFromStr: string,
  dateToStr: string,
  vendorId: string,
  categoryId: string,
): Parameters<typeof adminApi.reportsSnapshot>[0] | null {
  if (!dateFromStr || !dateToStr) return null;
  return {
    date_from: dateFromStr,
    date_to: dateToStr,
    ...(vendorId !== "all" ? { vendor_id: Number(vendorId) } : {}),
    ...(categoryId !== "all" ? { category_id: Number(categoryId) } : {}),
  };
}

function useReportFilterOptions() {
  const { data: vendorsRaw = [] } = useAdminList<Record<string, unknown>>(
    ["admin", "vendors", "reports-filters"],
    () => adminApi.vendors({ page_size: 100 }),
  );
  const { data: categoriesRaw = [] } = useAdminList<Record<string, unknown>>(
    ["admin", "categories", "reports-filters"],
    () => adminApi.categories({ page_size: 200 }),
  );
  const vendors = useMemo(
    () =>
      vendorsRaw.map((v) => ({
        id: Number(v.id),
        label: String(v.name ?? "Vendor"),
      })),
    [vendorsRaw],
  );
  const categories = useMemo(
    () =>
      categoriesRaw.map((c) => ({
        id: Number(c.id),
        label: String(c.name ?? "Category"),
      })),
    [categoriesRaw],
  );
  return { vendors, categories };
}

export default function ReportsModule() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => defaultRange());
  const [vendorId, setVendorId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const { vendors, categories } = useReportFilterOptions();

  const dateFromStr = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const dateToStr = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";
  const filtersReady = Boolean(dateFromStr && dateToStr);
  const snapParams = filtersReady ? snapshotQueryParams(dateFromStr, dateToStr, vendorId, categoryId) : null;

  const {
    data: snapshot,
    isLoading: snapLoading,
    isError: snapError,
    error: snapErr,
    refetch,
    isFetching: snapFetching,
  } = useQuery({
    queryKey: ["admin", "reports-snapshot", dateFromStr, dateToStr, vendorId, categoryId],
    queryFn: () => adminApi.reportsSnapshot(snapParams!),
    enabled: Boolean(snapParams),
    refetchInterval: 60_000,
    retry: 1,
  });

  const { data: summary } = useQuery({
    queryKey: ["admin", "summary", "reports-module"],
    queryFn: () => adminApi.summary(),
    retry: false,
  });

  const listQueryParams = useMemo(() => {
    if (!filtersReady) return null;
    return {
      page: 1,
      page_size: 500,
      date_from: dateFromStr,
      date_to: dateToStr,
      ...(vendorId !== "all" ? { vendor_id: Number(vendorId) } : {}),
      ...(categoryId !== "all" ? { category_id: Number(categoryId) } : {}),
    } as Record<string, string | number>;
  }, [filtersReady, dateFromStr, dateToStr, vendorId, categoryId]);

  const { data: orderRows = [] } = useQuery({
    queryKey: ["admin", "orders", "reports-detail", listQueryParams],
    queryFn: () => adminApi.orders(listQueryParams!),
    enabled: Boolean(listQueryParams),
    select: (d) => extractResults<AdminOrderListRow>(d),
  });

  const { data: walletRows = [] } = useQuery({
    queryKey: ["admin", "wallet-txns", "reports-detail", listQueryParams],
    queryFn: () => adminApi.walletTransactions(listQueryParams!),
    enabled: Boolean(listQueryParams),
    select: (d) => extractResults<Record<string, unknown>>(d),
  });

  const seriesChart = useMemo(() => {
    const s = snapshot?.series ?? [];
    return s.map((row) => ({
      name: row.day.length >= 10 ? row.day.slice(5, 10) : row.day,
      sales: row.sales,
      orders: row.orders,
    }));
  }, [snapshot]);

  const categoryPie = useMemo(() => {
    const rows = snapshot?.category_breakdown ?? [];
    const total = rows.reduce((a, c) => a + c.sales, 0) || 1;
    return rows.map((c) => ({
      name: c.name,
      value: Math.round((100 * c.sales) / total),
      sales: c.sales,
    }));
  }, [snapshot]);

  const vendorPie = useMemo(() => {
    const rows = snapshot?.vendor_breakdown ?? [];
    const total = rows.reduce((a, c) => a + c.sales, 0) || 1;
    return rows.slice(0, 8).map((c) => ({
      name: c.name,
      value: Math.round((100 * c.sales) / total),
      sales: c.sales,
    }));
  }, [snapshot]);

  const walletBarData = useMemo(
    () =>
      (snapshot?.wallet_by_type ?? []).map((w) => ({
        name: w.type.replace(/_/g, " "),
        amount: w.amount,
        count: w.count,
      })),
    [snapshot],
  );

  const signupChart = useMemo(
    () =>
      (snapshot?.signup_series ?? []).map((r) => ({
        name: r.day.length >= 10 ? r.day.slice(5, 10) : r.day,
        signups: r.signups,
      })),
    [snapshot],
  );

  const totalSignups = useMemo(
    () => (snapshot?.signup_series ?? []).reduce((a, r) => a + r.signups, 0),
    [snapshot],
  );

  const walletTotalAmount = useMemo(
    () => (snapshot?.wallet_by_type ?? []).reduce((a, w) => a + w.amount, 0),
    [snapshot],
  );

  const exportSnapshotCsv = () => {
    if (!snapshot) return;
    const rows = (snapshot.series ?? []).map((r) => ({
      day: r.day,
      sales: r.sales,
      orders: r.orders,
    }));
    downloadCsv(
      `report-series-${dateFromStr}-${dateToStr}.csv`,
      rowsToCsv(["day", "sales", "orders"], rows),
    );
  };

  const resetFilters = () => {
    setDateRange(defaultRange());
    setVendorId("all");
    setCategoryId("all");
  };

  const kpis = snapshot?.kpis;
  const showSkeleton = snapLoading && !snapshot;

  if (showSkeleton) {
    return <ReportsPageSkeleton />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground tracking-tight">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Unified dashboard — filters apply to every tab, charts, and tables.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!snapshot}
            onClick={exportSnapshotCsv}
          >
            Export series (CSV)
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="gap-1.5"
            disabled={!filtersReady}
            onClick={() => void refetch()}
          >
            <RefreshCw className={`h-4 w-4 ${snapFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <ReportsFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        vendorId={vendorId}
        onVendorIdChange={setVendorId}
        categoryId={categoryId}
        onCategoryIdChange={setCategoryId}
        vendors={vendors}
        categories={categories}
        onReset={resetFilters}
      />

      {!filtersReady ? (
        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          Select a complete date range (start and end) to load report data.
        </p>
      ) : null}

      {snapError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-destructive">
            {snapErr instanceof Error ? snapErr.message : "Could not load reports."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="flex w-full flex-nowrap justify-start overflow-x-auto h-auto p-1 bg-secondary/20 rounded-lg gap-1">
          {(
            [
              ["sales", "Sales", ShoppingCart],
              ["revenue", "Revenue", CreditCard],
              ["products", "Products", Package],
              ["customers", "Customers", Users],
              ["wallet", "Wallet", Wallet],
              ["vendors", "Vendors", Store],
            ] as const
          ).map(([value, label, Icon]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm gap-1.5"
            >
              <Icon className="h-4 w-4 opacity-80" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabSales
          snapshot={snapshot}
          kpis={kpis}
          seriesChart={seriesChart}
          categoryPie={categoryPie}
          orderRows={orderRows}
        />
        <TabRevenue snapshot={snapshot} kpis={kpis} seriesChart={seriesChart} orderRows={orderRows} />
        <TabProducts categoryPie={categoryPie} snapshot={snapshot} />
        <TabCustomers
          summary={summary}
          signupChart={signupChart}
          totalSignups={totalSignups}
          snapshot={snapshot}
        />
        <TabWallet
          walletBarData={walletBarData}
          walletTotalAmount={walletTotalAmount}
          snapshot={snapshot}
          walletRows={walletRows}
        />
        <TabVendors
          vendorPie={vendorPie}
          snapshot={snapshot}
          kpis={kpis}
          seriesChart={seriesChart}
        />
      </Tabs>
    </div>
  );
}

function TabSales({
  snapshot,
  kpis,
  seriesChart,
  categoryPie,
  orderRows,
}: {
  snapshot: AdminReportsSnapshot | undefined;
  kpis: AdminReportsSnapshot["kpis"] | undefined;
  seriesChart: { name: string; sales: number; orders: number }[];
  categoryPie: { name: string; value: number; sales: number }[];
  orderRows: AdminOrderListRow[];
}) {
  return (
    <TabsContent value="sales" className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <ReportsStatCard
          title="Total sales"
          value={fmtRs(kpis?.total_sales ?? 0)}
          icon={ShoppingCart}
          trendPct={kpis?.sales_growth_pct ?? null}
        />
        <ReportsStatCard
          title="Total orders"
          value={String(kpis?.total_orders ?? 0)}
          icon={LayoutDashboard}
          trendPct={kpis?.orders_growth_pct ?? null}
        />
        <ReportsStatCard title="Revenue" value={fmtRs(kpis?.total_sales ?? 0)} icon={CreditCard} />
        <ReportsStatCard
          title="Avg order value"
          value={fmtRs(kpis?.aov ?? 0)}
          icon={PieChartIcon}
          trendPct={null}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportChartCard title="Sales vs orders" subtitle="Comparison by day">
          <div className="h-[260px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seriesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="sales" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Sales (Rs.)" />
                <Bar dataKey="orders" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} name="Orders" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
        <ReportChartCard title="Sales trend" subtitle="Line over selected period">
          <div className="h-[260px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke={CHART_PRIMARY}
                  strokeWidth={2}
                  dot={false}
                  name="Sales"
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>
      {categoryPie.length > 0 ? (
        <ReportChartCard title="Category mix (sales share)" subtitle="Donut by revenue in scope">
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {categoryPie.map((_, idx) => (
                    <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      ) : null}
      <ReportsDataTable<Record<string, unknown>>
        title="Order detail"
        subtitle="All orders in the selected filters (up to 500 rows)"
        csvFilename={`orders-${snapshot?.period.date_from ?? ""}-${snapshot?.period.date_to ?? ""}`}
        rowKey="id"
        searchKeys={["id", "customer", "seller", "status", "payment"]}
        columns={[
          { key: "id", label: "Order" },
          { key: "date", label: "Date" },
          { key: "customer", label: "Customer" },
          { key: "seller", label: "Vendor" },
          { key: "total", label: "Total", render: (r) => fmtRs(Number(r.total)) },
          { key: "status", label: "Status" },
          { key: "payment", label: "Payment" },
        ]}
        rows={orderRows as unknown as Record<string, unknown>[]}
      />
    </TabsContent>
  );
}

function TabRevenue({
  kpis,
  seriesChart,
  orderRows,
  snapshot,
}: {
  kpis: AdminReportsSnapshot["kpis"] | undefined;
  seriesChart: { name: string; sales: number; orders: number }[];
  orderRows: AdminOrderListRow[];
  snapshot: AdminReportsSnapshot | undefined;
}) {
  return (
    <TabsContent value="revenue" className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <ReportsStatCard title="Revenue" value={fmtRs(kpis?.total_sales ?? 0)} icon={CreditCard} trendPct={kpis?.sales_growth_pct ?? null} />
        <ReportsStatCard title="Orders" value={String(kpis?.total_orders ?? 0)} icon={ShoppingCart} trendPct={kpis?.orders_growth_pct ?? null} />
        <ReportsStatCard title="Avg order value" value={fmtRs(kpis?.aov ?? 0)} icon={LayoutDashboard} trendPct={null} />
        <ReportsStatCard title="Prev. revenue" value={fmtRs(kpis?.previous_total_sales ?? 0)} icon={PieChartIcon} trendPct={null} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportChartCard title="Revenue by day" subtitle="Bar comparison">
          <div className="h-[260px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={seriesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="sales" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
        <ReportChartCard title="Revenue trend">
          <div className="h-[260px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="sales" stroke={CHART_SECONDARY} strokeWidth={2} dot={false} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>
      <ReportsDataTable
        title="Revenue detail"
        subtitle="Orders contributing to revenue in this range"
        csvFilename={`revenue-orders-${snapshot?.period.date_from ?? ""}`}
        rowKey="id"
        searchKeys={["id", "customer", "seller"]}
        columns={[
          { key: "id", label: "Order" },
          { key: "date", label: "Date" },
          { key: "customer", label: "Customer" },
          { key: "total", label: "Total", render: (r) => fmtRs(Number(r.total)) },
          { key: "items", label: "Items" },
          { key: "status", label: "Status" },
        ]}
        rows={orderRows as unknown as Record<string, unknown>[]}
      />
    </TabsContent>
  );
}

function TabProducts({
  categoryPie,
  snapshot,
}: {
  categoryPie: { name: string; value: number; sales: number }[];
  snapshot: AdminReportsSnapshot | undefined;
}) {
  const breakdown = snapshot?.category_breakdown ?? [];
  const tableRows: Record<string, unknown>[] = breakdown.map((c) => ({
    id: String(c.category_id ?? c.name),
    name: c.name,
    sales: c.sales,
    lines: c.lines,
  }));

  return (
    <TabsContent value="products" className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <ReportsStatCard title="Categories (in scope)" value={String(breakdown.length)} icon={Package} trendPct={null} />
        <ReportsStatCard
          title="Top category sales"
          value={fmtRs(breakdown[0]?.sales ?? 0)}
          icon={PieChartIcon}
          trendPct={null}
        />
        <ReportsStatCard
          title="Line items"
          value={String(breakdown.reduce((a, c) => a + c.lines, 0))}
          icon={LayoutDashboard}
          trendPct={null}
        />
        <ReportsStatCard
          title="Catalog revenue"
          value={fmtRs(breakdown.reduce((a, c) => a + c.sales, 0))}
          icon={CreditCard}
          trendPct={null}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportChartCard title="Category sales" subtitle="Bar by Rs.">
          <div className="h-[260px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown.map((c) => ({ name: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name, sales: c.sales }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} interval={0} angle={-25} textAnchor="end" height={70} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="sales" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
        {categoryPie.length > 0 ? (
          <ReportChartCard title="Category distribution" subtitle="Donut (% of sales)">
            <div className="h-[260px] sm:h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    label={({ name, value }) => `${name} ${value}%`}
                  >
                    {categoryPie.map((_, idx) => (
                      <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ReportChartCard>
        ) : (
          <ReportChartCard title="Category distribution">
            <p className="text-sm text-muted-foreground py-16 text-center">No category sales in this range.</p>
          </ReportChartCard>
        )}
      </div>
      <ReportsDataTable
        title="Category breakdown"
        subtitle="From order line items in scope"
        csvFilename={`categories-${snapshot?.period.date_from ?? ""}`}
        rowKey="id"
        searchKeys={["name"]}
        columns={[
          { key: "name", label: "Category" },
          { key: "sales", label: "Sales", render: (r) => fmtRs(Number(r.sales)) },
          { key: "lines", label: "Line items" },
        ]}
        rows={tableRows}
      />
    </TabsContent>
  );
}

function TabCustomers({
  summary,
  signupChart,
  totalSignups,
  snapshot,
}: {
  summary: Awaited<ReturnType<typeof adminApi.summary>> | undefined;
  signupChart: { name: string; signups: number }[];
  totalSignups: number;
  snapshot: AdminReportsSnapshot | undefined;
}) {
  const signupRows: Record<string, unknown>[] = signupChart.map((r, i) => ({
    id: `${r.name}-${i}`,
    day: r.name,
    signups: r.signups,
  }));

  return (
    <TabsContent value="customers" className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <ReportsStatCard title="Total users" value={String(summary?.total_users ?? "—")} icon={Users} trendPct={null} />
        <ReportsStatCard title="New signups (range)" value={String(totalSignups)} icon={Users} trendPct={null} />
        <ReportsStatCard title="Total vendors" value={String(summary?.total_vendors ?? "—")} icon={Store} trendPct={null} />
        <ReportsStatCard
          title="Wallet balance (all)"
          value={fmtRs(summary?.wallet_balance_total ?? 0)}
          icon={Wallet}
          trendPct={null}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportChartCard title="Signups by day" subtitle="Bar">
          <div className="h-[260px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="signups" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Signups" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
        <ReportChartCard title="Signup trend" subtitle="Line">
          <div className="h-[260px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signupChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="signups" stroke={CHART_SECONDARY} strokeWidth={2} dot={false} name="Signups" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>
      <ReportChartCard title="Orders activity (same filters)" subtitle="Line — relates to customer demand in period">
        <div className="h-[240px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={snapshot?.series ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tickFormatter={(d) => (d.length >= 10 ? d.slice(5, 10) : d)} tick={chartAxisTick} />
              <YAxis tick={chartAxisTick} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="orders" stroke={CHART_PRIMARY} strokeWidth={2} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ReportChartCard>
      <ReportsDataTable
        title="Signups by day"
        csvFilename={`signups-${snapshot?.period.date_from ?? ""}`}
        rowKey="id"
        searchKeys={["day"]}
        columns={[
          { key: "day", label: "Day" },
          { key: "signups", label: "Signups" },
        ]}
        rows={signupRows}
      />
    </TabsContent>
  );
}

function TabWallet({
  walletBarData,
  walletTotalAmount,
  snapshot,
  walletRows,
}: {
  walletBarData: { name: string; amount: number; count: number }[];
  walletTotalAmount: number;
  snapshot: AdminReportsSnapshot | undefined;
  walletRows: Record<string, unknown>[];
}) {
  const lineFromBar = walletBarData.map((w) => ({ name: w.name, amount: w.amount }));

  return (
    <TabsContent value="wallet" className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <ReportsStatCard title="Txn volume (range)" value={fmtRs(walletTotalAmount)} icon={Wallet} trendPct={null} />
        <ReportsStatCard title="Txn types" value={String(walletBarData.length)} icon={PieChartIcon} trendPct={null} />
        <ReportsStatCard title="Total orders (scope)" value={String(snapshot?.kpis.total_orders ?? 0)} icon={ShoppingCart} trendPct={null} />
        <ReportsStatCard title="Sales (scope)" value={fmtRs(snapshot?.kpis.total_sales ?? 0)} icon={CreditCard} trendPct={null} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportChartCard title="Wallet activity by type" subtitle="Bar — amount">
          <div className="h-[260px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={walletBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} interval={0} angle={-20} textAnchor="end" height={72} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="amount" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Amount" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
        <ReportChartCard title="Type totals trend-style" subtitle="Line over types">
          <div className="h-[260px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineFromBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} interval={0} angle={-20} textAnchor="end" height={72} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="amount" stroke={CHART_SECONDARY} strokeWidth={2} dot name="Amount" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>
      {walletBarData.length > 0 ? (
        <ReportChartCard title="Share by type" subtitle="Donut (amount)">
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={walletBarData.map((w) => ({
                    name: w.name,
                    value: walletTotalAmount > 0 ? Math.round((100 * w.amount) / walletTotalAmount) : 0,
                  }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {walletBarData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      ) : null}
      <ReportsDataTable
        title="Wallet transactions"
        subtitle="Filtered by the same date range"
        csvFilename={`wallet-txns-${snapshot?.period.date_from ?? ""}`}
        rowKey="id"
        searchKeys={["user", "type", "item", "status"]}
        columns={[
          { key: "id", label: "ID" },
          { key: "user", label: "Party" },
          { key: "type", label: "Type" },
          { key: "item", label: "Description" },
          { key: "amount", label: "Amount", render: (r) => fmtRs(Number(r.amount)) },
          { key: "time", label: "Time" },
          { key: "status", label: "Status" },
        ]}
        rows={walletRows}
      />
    </TabsContent>
  );
}

function TabVendors({
  vendorPie,
  snapshot,
  kpis,
  seriesChart,
}: {
  vendorPie: { name: string; value: number; sales: number }[];
  snapshot: AdminReportsSnapshot | undefined;
  kpis: AdminReportsSnapshot["kpis"] | undefined;
  seriesChart: { name: string; sales: number; orders: number }[];
}) {
  const vendors = snapshot?.vendor_breakdown ?? [];
  const tableRows: Record<string, unknown>[] = vendors.map((v) => ({
    id: String(v.vendor_id),
    name: v.name,
    sales: v.sales,
    orders: v.orders,
  }));

  return (
    <TabsContent value="vendors" className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <ReportsStatCard title="Vendors (in range)" value={String(vendors.length)} icon={Store} trendPct={null} />
        <ReportsStatCard title="Sales (scope)" value={fmtRs(kpis?.total_sales ?? 0)} icon={ShoppingCart} trendPct={kpis?.sales_growth_pct ?? null} />
        <ReportsStatCard title="Orders (scope)" value={String(kpis?.total_orders ?? 0)} icon={LayoutDashboard} trendPct={kpis?.orders_growth_pct ?? null} />
        <ReportsStatCard title="Top vendor sales" value={fmtRs(vendors[0]?.sales ?? 0)} icon={PieChartIcon} trendPct={null} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportChartCard title="Vendor revenue comparison">
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendors.map((v) => ({ name: v.name.length > 12 ? `${v.name.slice(0, 10)}…` : v.name, sales: v.sales }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={chartAxisTick} />
                <YAxis type="category" dataKey="name" width={100} tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="sales" fill={CHART_PRIMARY} radius={[0, 4, 4, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
        <ReportChartCard title="Platform sales trend" subtitle="Same filters — all vendors combined">
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={chartAxisTick} />
                <YAxis tick={chartAxisTick} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="sales" stroke={CHART_SECONDARY} strokeWidth={2} dot={false} name="Sales" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      </div>
      {vendorPie.length > 0 ? (
        <ReportChartCard title="Vendor share" subtitle="Donut (top vendors)">
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vendorPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={88}
                  label={({ name, value }) => `${name} ${value}%`}
                >
                  {vendorPie.map((_, idx) => (
                    <Cell key={idx} fill={CHART_PALETTE[idx % CHART_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ReportChartCard>
      ) : null}
      <ReportsDataTable
        title="Vendor performance"
        csvFilename={`vendors-${snapshot?.period.date_from ?? ""}`}
        rowKey="id"
        searchKeys={["name"]}
        columns={[
          { key: "name", label: "Vendor" },
          { key: "sales", label: "Sales", render: (r) => fmtRs(Number(r.sales)) },
          { key: "orders", label: "Orders" },
        ]}
        rows={tableRows}
      />
    </TabsContent>
  );
}
