import React, { useState } from 'react';
import { useGetAllocationReport } from '@workspace/api-client-react';
import { PageContent, PageHeader } from '@/components/layout';
import { MonthFilter } from '@/components/month-filter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormatCurrency } from '@/components/formatters';
import { Skeleton } from '@/components/ui/skeleton';

export default function AllocationEngine() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data: allocation, isLoading } = useGetAllocationReport({ month }, { query: { queryKey: ['allocation', month] } });

  const totals = (allocation as any[])?.reduce((acc, row) => {
    acc.caUsd += row.caUsd;
    acc.txUsd += row.txUsd;
    acc.uaeUsd += row.uaeUsd;
    acc.pkUsd += row.pkUsd;
    acc.buzzUsd += row.buzzUsd;
    acc.totalUsd += row.totalUsd;
    return acc;
  }, { caUsd: 0, txUsd: 0, uaeUsd: 0, pkUsd: 0, buzzUsd: 0, totalUsd: 0 });

  return (
    <>
      <PageHeader title="Allocation Engine" description="Final distributed costs after applying percentage splits and direct mappings">
        <MonthFilter value={month} onChange={setMonth} />
      </PageHeader>
      <PageContent>
        <div className="border rounded-sm bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-sidebar border-b">
                <TableHead className="font-mono text-xs font-semibold text-sidebar-foreground">Expense Category</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">CA (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">TX (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">UAE (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">PK (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">BuzzFlick (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground bg-primary/20">Total (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : (allocation as any[])?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-mono text-sm">No allocation data found for this period</TableCell>
                </TableRow>
              ) : (
                <>
                  {(allocation as any[])?.map((row, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm">{row.expenseCategory}</TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={row.caUsd} /></TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={row.txUsd} /></TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={row.uaeUsd} /></TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={row.pkUsd} /></TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={row.buzzUsd} /></TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm bg-primary/5"><FormatCurrency amount={row.totalUsd} /></TableCell>
                    </TableRow>
                  ))}
                  {totals && (
                    <TableRow className="bg-muted hover:bg-muted font-bold border-t-2 border-primary">
                      <TableCell colSpan={2} className="text-right text-xs font-mono uppercase tracking-widest">Grand Total</TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={totals.caUsd} /></TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={totals.txUsd} /></TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={totals.uaeUsd} /></TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={totals.pkUsd} /></TableCell>
                      <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={totals.buzzUsd} /></TableCell>
                      <TableCell className="text-right font-mono text-sm bg-primary/10"><FormatCurrency amount={totals.totalUsd} /></TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>
    </>
  );
}
