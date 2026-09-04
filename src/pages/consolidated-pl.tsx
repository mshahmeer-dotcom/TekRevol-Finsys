import React, { useState } from 'react';
import { useGetConsolidatedPL } from '@workspace/api-client-react';
import { PageContent, PageHeader } from '@/components/layout';
import { MonthFilter } from '@/components/month-filter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormatCurrency, FormatPct } from '@/components/formatters';
import { Skeleton } from '@/components/ui/skeleton';

export default function ConsolidatedPL() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data: pl, isLoading } = useGetConsolidatedPL({ month }, { query: { queryKey: ['consolidated-pl', month] } });

  const getRowClass = (type: string) => {
    switch (type) {
      case 'profit': return 'font-bold bg-muted/50 border-t-2';
      case 'margin': return 'font-mono text-xs text-muted-foreground bg-muted/30';
      case 'revenue': return 'text-green-700 dark:text-green-400';
      case 'expense': return 'text-red-700 dark:text-red-400';
      default: return '';
    }
  };

  return (
    <>
      <PageHeader title="Consolidated P&L" description="Company-wide profit & loss summary across all brands">
        <MonthFilter value={month} onChange={setMonth} />
      </PageHeader>
      <PageContent>
        <div className="border rounded-sm bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-sidebar border-b">
                <TableHead className="font-mono text-xs font-semibold text-sidebar-foreground">Line Item</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">CA (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">TX (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">UAE (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">BuzzFlick (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground bg-primary/20">Consolidated (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : pl?.rows?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-sm">No P&L data found</TableCell>
                </TableRow>
              ) : (
                pl?.rows?.map((row: any, i: number) => {
                  const subRows =
                    row.label === 'Total Revenue' ? pl?.revenueBreakdown :
                    row.label === 'Total Expenses' ? pl?.expenseBreakdown :
                    null;
                  return (
                    <React.Fragment key={i}>
                      <TableRow className={`hover:bg-muted/10 ${getRowClass(row.type)}`}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.type === 'margin' ? <FormatPct amount={row.ca} /> : <FormatCurrency amount={row.ca} />}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.type === 'margin' ? <FormatPct amount={row.tx} /> : <FormatCurrency amount={row.tx} />}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.type === 'margin' ? <FormatPct amount={row.uae} /> : <FormatCurrency amount={row.uae} />}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.type === 'margin' ? <FormatPct amount={row.buzz} /> : <FormatCurrency amount={row.buzz} />}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm bg-primary/5">
                          {row.type === 'margin' ? <FormatPct amount={row.total} /> : <FormatCurrency amount={row.total} />}
                        </TableCell>
                      </TableRow>
                      {subRows?.map((sub: any, j: number) => (
                        <TableRow key={`${i}-${j}`} className="hover:bg-muted/10 text-muted-foreground text-xs">
                          <TableCell className="pl-8">{sub.label}</TableCell>
                          <TableCell className="text-right font-mono"><FormatCurrency amount={sub.ca} /></TableCell>
                          <TableCell className="text-right font-mono"><FormatCurrency amount={sub.tx} /></TableCell>
                          <TableCell className="text-right font-mono"><FormatCurrency amount={sub.uae} /></TableCell>
                          <TableCell className="text-right font-mono"><FormatCurrency amount={sub.buzz} /></TableCell>
                          <TableCell className="text-right font-mono bg-primary/5"><FormatCurrency amount={sub.total} /></TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>
    </>
  );
}
