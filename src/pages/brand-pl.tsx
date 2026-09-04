import React, { useState } from 'react';
import { useGetBrandPL } from '@workspace/api-client-react';
import { PageContent, PageHeader } from '@/components/layout';
import { MonthFilter } from '@/components/month-filter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormatCurrency, FormatPct, RevenueTypeBadge } from '@/components/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrandPL() {
  const { entity } = useParams();
  const entityCode = entity as string;
  const [month, setMonth] = useState<string | undefined>(undefined);

  const { data: pl, isLoading } = useGetBrandPL(
    { entity: entityCode, month },
    { query: { queryKey: ['brand-pl', entityCode, month] } },
  );

  const getEntityName = (code: string) => {
    switch (code?.toUpperCase()) {
      case 'CA': return 'California';
      case 'TX': return 'Texas';
      case 'UAE': return 'United Arab Emirates';
      case 'BUZZFLICK': return 'BuzzFlick';
      default: return code;
    }
  };

  return (
    <>
      <PageHeader title={`${getEntityName(entityCode)} Profit & Loss`} description={`Financial performance for the ${entityCode} brand`}>
        <MonthFilter value={month} onChange={setMonth} />
      </PageHeader>
      <PageContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="rounded-sm border-sidebar-border bg-sidebar text-sidebar-foreground">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-mono text-sidebar-foreground/70 uppercase tracking-wider">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {isLoading ? <Skeleton className="h-8 w-24 bg-sidebar-foreground/10" /> : (
                <div className="text-2xl font-bold tracking-tight text-green-400">
                  <FormatCurrency amount={pl?.totalRevenue || 0} />
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-sm border-sidebar-border bg-sidebar text-sidebar-foreground">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-mono text-sidebar-foreground/70 uppercase tracking-wider">Total Allocated Cost</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {isLoading ? <Skeleton className="h-8 w-24 bg-sidebar-foreground/10" /> : (
                <div className="text-2xl font-bold tracking-tight text-red-400">
                  <FormatCurrency amount={pl?.totalExpenses || 0} />
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="rounded-sm border-sidebar-border bg-sidebar text-sidebar-foreground">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-mono text-sidebar-foreground/70 uppercase tracking-wider">Net Profit</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex items-end justify-between">
              {isLoading ? <Skeleton className="h-8 w-24 bg-sidebar-foreground/10" /> : (
                <>
                  <div className={`text-2xl font-bold tracking-tight ${(pl?.netProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <FormatCurrency amount={pl?.netProfit || 0} />
                  </div>
                  <div className="text-sm font-mono opacity-80 mb-1">
                    Margin: <FormatPct amount={pl?.profitMargin || 0} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border rounded-sm bg-card overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b">
              <h3 className="font-semibold text-sm">Revenue by Type</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">Type</TableHead>
                  <TableHead className="font-mono text-xs text-right">Amount (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}><TableCell><Skeleton className="h-4 w-32" /></TableCell><TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell></TableRow>
                  ))
                ) : pl?.revenueByType?.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-sm">No revenue</TableCell></TableRow>
                ) : (
                  pl?.revenueByType?.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm"><RevenueTypeBadge type={r.type} /></TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={r.amount} /></TableCell>
                    </TableRow>
                  ))
                )}
                {pl && (
                  <TableRow className="font-bold border-t-2">
                    <TableCell className="text-sm">Total</TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-700 dark:text-green-400">
                      <FormatCurrency amount={pl.totalRevenue} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border rounded-sm bg-card overflow-hidden">
            <div className="bg-muted px-4 py-2 border-b">
              <h3 className="font-semibold text-sm">Allocated Expense Breakdown</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">Expense Category</TableHead>
                  <TableHead className="font-mono text-xs text-right">Allocated Amount (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell><Skeleton className="h-4 w-32" /></TableCell><TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell></TableRow>
                  ))
                ) : pl?.expensesByCategory?.length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center py-4 text-muted-foreground text-sm">No allocated expenses</TableCell></TableRow>
                ) : (
                  pl?.expensesByCategory?.map((e: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{e.category}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-red-700 dark:text-red-400">
                        <FormatCurrency amount={e.amount} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {pl && (
                  <TableRow className="font-bold border-t-2">
                    <TableCell className="text-sm">Total</TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-700 dark:text-red-400">
                      <FormatCurrency amount={pl.totalExpenses} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </PageContent>
    </>
  );
}
