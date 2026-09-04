import React, { useState } from "react";
import {
  useGetDashboard,
  useGetMonthlyTrend,
} from "@workspace/api-client-react";
import { PageContent, PageHeader } from "@/components/layout";
import { MonthFilter } from "@/components/month-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormatCurrency, FormatPct } from "@/components/formatters";
import { Skeleton } from "@/components/ui/skeleton";
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

const DASHBOARD_BRAND_OPTIONS = [
  { value: "all", label: "All Brands" },
  { value: "CA", label: "CA" },
  { value: "TX", label: "TX" },
  { value: "UAE", label: "UAE" },
  { value: "BuzzFlick", label: "BuzzFlick" },
];

function BrandFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px] h-8 text-xs font-mono">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DASHBOARD_BRAND_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function KpiCard({
  title,
  value,
  type = "currency",
  loading = false,
}: {
  title: string;
  value?: number;
  type?: "currency" | "percent";
  loading?: boolean;
}) {
  return (
    <Card className="rounded-sm border-sidebar-border shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold tracking-tight">
            {type === "currency" ? (
              <FormatCurrency amount={value || 0} />
            ) : (
              <FormatPct amount={value || 0} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [brand, setBrand] = useState<string>("all");
  const { data: dashboard, isLoading } = useGetDashboard(
    { month, brand },
    { query: { queryKey: ["dashboard", month, brand] } },
  );
  const { data: trend, isLoading: trendLoading } = useGetMonthlyTrend({
    query: { queryKey: ["monthly-trend"] },
  });

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const revenueTypeData = [
    { name: "Fresh", value: dashboard?.freshRevenue || 0 },
    { name: "Recurring", value: dashboard?.recurringRevenue || 0 },
    { name: "Upsell", value: dashboard?.upsellRevenue || 0 },
  ].filter((d) => d.value > 0);

  return (
    <>
      <PageHeader
        title="Command Center"
        description="Consolidated financial overview"
      >
        <BrandFilter value={brand} onChange={setBrand} />
        <MonthFilter value={month} onChange={setMonth} />
      </PageHeader>
      <PageContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Revenue"
            value={dashboard?.totalRevenue}
            loading={isLoading}
          />
          <KpiCard
            title="Total Expenses"
            value={dashboard?.totalExpenses}
            loading={isLoading}
          />
          <KpiCard
            title="Net Profit"
            value={dashboard?.netProfit}
            loading={isLoading}
          />
          <KpiCard
            title="Gross Margin"
            value={dashboard?.grossMargin}
            type="percent"
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <KpiCard
            title="Fresh Revenue"
            value={dashboard?.freshRevenue}
            loading={isLoading}
          />
          <KpiCard
            title="Recurring Revenue"
            value={dashboard?.recurringRevenue}
            loading={isLoading}
          />
          <KpiCard
            title="Upsell Revenue"
            value={dashboard?.upsellRevenue}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Revenue by Type (Fresh / Recurring / Upsell)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={
                          revenueTypeData.length > 0
                            ? revenueTypeData
                            : [{ name: "No Data", value: 1 }]
                        }
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {(revenueTypeData.length > 0
                          ? revenueTypeData
                          : [{ name: "No Data", value: 1 }]
                        ).map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) =>
                          new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          }).format(val)
                        }
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Revenue by Brand
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboard?.revenueByBrand || []}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fontFamily: "monospace" }}
                      />
                      <YAxis
                        tickFormatter={(val) => `$${val / 1000}k`}
                        tick={{ fontSize: 12, fontFamily: "monospace" }}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))" }}
                        formatter={(val: number) =>
                          new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          }).format(val)
                        }
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {(dashboard?.revenueByBrand || []).map(
                          (_: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ),
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-2">
          <Card className="rounded-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Monthly Trend (P&L)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend || []}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fontFamily: "monospace" }}
                      />
                      <YAxis
                        tickFormatter={(val) => `$${val / 1000}k`}
                        tick={{ fontSize: 12, fontFamily: "monospace" }}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted))" }}
                        formatter={(val: number) =>
                          new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          }).format(val)
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cost"
                        name="Cost"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        name="Net Profit"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
