import React, { useState } from 'react';
import { useGetMonthlyPL } from '@workspace/api-client-react';
import { PageContent, PageHeader } from '@/components/layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormatCurrency, FormatPct } from '@/components/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

const YEARS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

const BRAND_OPTIONS = [
  { value: 'all', label: 'All Brands' },
  { value: 'CA', label: 'CA' },
  { value: 'TX', label: 'TX' },
  { value: 'UAE', label: 'AE' },
  { value: 'PK', label: 'PK' },
  { value: 'BuzzFlick', label: 'BuzzFlick' },
];

function getRowStyle(type: string) {
  switch (type) {
    case 'revenue': return 'text-green-700 dark:text-green-400';
    case 'expense': return 'text-red-700 dark:text-red-400';
    case 'profit': return 'font-bold bg-muted/50 border-t-2';
    case 'margin': return 'font-mono text-xs text-muted-foreground bg-muted/30';
    default: return '';
  }
}

export default function MonthlyPL() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [brand, setBrand] = useState('all');
  const { data: pl, isLoading } = useGetMonthlyPL(
    { year, brand },
    { query: { queryKey: ['monthly-pl', year, brand] } },
  );

  const months: string[] = pl?.months || [];
  const rows: any[] = pl?.rows || [];
  const totals = pl?.totals;

  const handleExport = async () => {
    const { utils, writeFile } = await import('xlsx');
    if (!pl) return;
    const header = ['Metric', ...months, 'Total'];
    const data = rows.map(r => {
      const isMargin = r.type === 'margin';
      const rowVals = r.values.map((v: number) => isMargin ? `${v.toFixed(1)}%` : Math.round(v));
      const totalVal = r.values.reduce((a: number, b: number) => a + b, 0);
      return [r.label, ...rowVals, isMargin ? `${(totalVal / months.length).toFixed(1)}%` : Math.round(totalVal)];
    });
    const ws = utils.aoa_to_sheet([header, ...data]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, `Monthly P&L ${year}`);
    writeFile(wb, `monthly-pl-${year}${brand !== 'all' ? `-${brand}` : ''}.xlsx`);
  };

  return (
    <>
      <PageHeader title="Monthly Consolidated P&L" description="Side-by-side monthly financial comparison">
        {/* Brand Slicer */}
        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger className="w-[140px] font-mono text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRAND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px] font-mono text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!pl}>
          <Download className="mr-2 size-4" /> Export
        </Button>
      </PageHeader>
      <PageContent>
        {brand !== 'all' && (
          <div className="mb-3 text-sm text-muted-foreground font-mono">
            Showing: <span className="font-semibold text-foreground">{BRAND_OPTIONS.find(b => b.value === brand)?.label}</span> brand only
          </div>
        )}
        <div className="border rounded-sm bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-sidebar border-b">
                <TableHead className="font-mono text-xs font-semibold text-sidebar-foreground sticky left-0 bg-sidebar min-w-[160px]">Metric</TableHead>
                {isLoading
                  ? Array.from({ length: 12 }).map((_, i) => <TableHead key={i}><Skeleton className="h-4 w-16" /></TableHead>)
                  : months.map(m => (
                    <TableHead key={m} className="font-mono text-xs font-semibold text-right text-sidebar-foreground min-w-[100px]">
                      {m}
                    </TableHead>
                  ))
                }
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground bg-primary/20 min-w-[110px]">Full Year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    {Array.from({ length: 13 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-20 ml-auto" /></TableCell>)}
                  </TableRow>
                ))
              ) : (
                rows.map((row, i) => {
                  const isMargin = row.type === 'margin';
                  const total = row.values.reduce((a: number, b: number) => a + b, 0);
                  const avgOrTotal = isMargin ? total / (row.values.filter((v: number) => v !== 0).length || 1) : total;

                  return (
                    <TableRow key={i} className={`hover:bg-muted/10 ${getRowStyle(row.type)}`}>
                      <TableCell className="font-medium sticky left-0 bg-card">{row.label}</TableCell>
                      {row.values.map((v: number, j: number) => (
                        <TableCell key={j} className="text-right font-mono text-sm">
                          {isMargin ? <FormatPct amount={v} /> : <FormatCurrency amount={v} />}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-mono font-bold text-sm bg-primary/5">
                        {isMargin ? <FormatPct amount={avgOrTotal} /> : <FormatCurrency amount={avgOrTotal} />}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {totals && !isLoading && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[
              { label: 'Total Revenue', value: totals.revenue, color: 'text-green-700 dark:text-green-400' },
              { label: 'Total Expenses', value: totals.expenses, color: 'text-red-700 dark:text-red-400' },
              { label: 'Net Profit', value: totals.profit, color: totals.profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="border rounded-sm bg-card p-4">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-2xl font-bold font-mono ${color}`}><FormatCurrency amount={value} /></p>
              </div>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
