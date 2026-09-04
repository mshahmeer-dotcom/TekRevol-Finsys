import React, { useState } from 'react';
import {
  useGetIntercompany,
  useListIntercompanyTransactions,
  useCreateIntercompanyTransaction,
  useUpdateIntercompanyTransaction,
  useDeleteIntercompanyTransaction,
  getListIntercompanyTransactionsQueryKey,
} from '@workspace/api-client-react';
import { PageContent, PageHeader } from '@/components/layout';
import { MonthFilter } from '@/components/month-filter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormatCurrency } from '@/components/formatters';
import { EntityBadge } from '@/components/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, Download, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ENTITIES, CURRENCIES, ENTITY_LABELS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

// ---- Tooltip component for brand breakdown ----
function BrandBreakdownTooltip({ breakdown }: { breakdown: { entity: string; netAmount: number }[] }) {
  const [show, setShow] = useState(false);
  const relevant = breakdown.filter(b => Math.abs(b.netAmount) > 0.01);
  if (relevant.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-dashed font-mono text-sm cursor-pointer"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(s => !s)}
      >
        View
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-0 mb-2 bg-popover border rounded-md shadow-lg p-3 min-w-[220px]">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Counterparty</p>
          {relevant.map(b => (
            <div key={b.entity} className="flex items-center justify-between gap-4 py-0.5">
              <span className="text-xs"><EntityBadge entity={b.entity} /></span>
              <span className={`font-mono text-xs font-semibold ${b.netAmount >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {b.netAmount >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(b.netAmount)}
              </span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground mt-2">+ means recoverable from / − means payable to counterparty</p>
        </div>
      )}
    </div>
  );
}

// ---- Intercompany Transaction form ----
const txSchema = z.object({
  date: z.string().min(1, 'Required'),
  fromEntity: z.string().min(1, 'Required'),
  toEntity: z.string().min(1, 'Required'),
  originalCurrency: z.string().min(1, 'Required'),
  originalAmount: z.coerce.number().min(0, 'Required'),
  exchangeRate: z.coerce.number().min(0),
  description: z.string().optional(),
});
type TxFormValues = z.infer<typeof txSchema>;

function TransactionFormModal({ open, onOpenChange, txToEdit }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  txToEdit?: any;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTx = useCreateIntercompanyTransaction();
  const updateTx = useUpdateIntercompanyTransaction();
  const isEdit = !!txToEdit;

  const form = useForm<TxFormValues>({
    resolver: zodResolver(txSchema),
    defaultValues: isEdit ? {
      ...txToEdit,
      description: txToEdit.description || '',
    } : {
      date: format(new Date(), 'yyyy-MM-dd'),
      fromEntity: 'CA',
      toEntity: 'PK',
      originalCurrency: 'USD',
      originalAmount: 0,
      exchangeRate: 1,
      description: '',
    },
  });

  const onSubmit = (values: TxFormValues) => {
    if (isEdit) {
      updateTx.mutate({ id: txToEdit.id, data: values }, {
        onSuccess: () => {
          toast({ title: 'Transaction updated' });
          queryClient.invalidateQueries({ queryKey: getListIntercompanyTransactionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ['intercompany'] });
          onOpenChange(false);
        },
      });
    } else {
      createTx.mutate({ data: values }, {
        onSuccess: () => {
          toast({ title: 'Transaction recorded' });
          queryClient.invalidateQueries({ queryKey: getListIntercompanyTransactionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ['intercompany'] });
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Transaction' : 'Record Intercompany Transaction'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="fromEntity" render={({ field }) => (
                <FormItem>
                  <FormLabel>From Entity</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{ENTITIES.map(e => <SelectItem key={e} value={e}>{ENTITY_LABELS[e] || e}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="toEntity" render={({ field }) => (
                <FormItem>
                  <FormLabel>To Entity</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{ENTITIES.map(e => <SelectItem key={e} value={e}>{ENTITY_LABELS[e] || e}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-4 bg-muted/30 p-3 rounded-md">
              <FormField control={form.control} name="originalCurrency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="originalAmount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="exchangeRate" render={({ field }) => (
                <FormItem><FormLabel>Exch. Rate</FormLabel><FormControl><Input type="number" step="0.00001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} placeholder="e.g. Q1 PK operations funding" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createTx.isPending || updateTx.isPending}>
                {isEdit ? 'Update' : 'Record Transaction'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Intercompany() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data: icData, isLoading } = useGetIntercompany({ month }, { query: { queryKey: ['intercompany', month] } });
  const { data: txList, isLoading: txLoading } = useListIntercompanyTransactions({ month }, { query: { queryKey: getListIntercompanyTransactionsQueryKey({ month }) } });
  const deleteTx = useDeleteIntercompanyTransaction();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txToEdit, setTxToEdit] = useState<any>(null);

  // API now returns { entities: [...], pkFunding: {...} }. Handle both new shape and legacy array.
  const entities: any[] = Array.isArray(icData) ? icData : (icData?.entities || []);
  const pkFunding = Array.isArray(icData) ? null : (icData?.pkFunding || null);

  const handleDeleteTx = (id: number) => {
    if (!confirm('Delete this intercompany transaction?')) return;
    deleteTx.mutate({ id }, {
      onSuccess: () => {
        toast({ title: 'Transaction deleted' });
        queryClient.invalidateQueries({ queryKey: getListIntercompanyTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ['intercompany'] });
      },
    });
  };

  const handleExportTx = async () => {
    const { utils, writeFile } = await import('xlsx');
    const rows = (txList || []) as any[];
    const ws = utils.json_to_sheet(rows.map(t => ({
      Date: t.date,
      'From Entity': t.fromEntity,
      'To Entity': t.toEntity,
      Currency: t.originalCurrency,
      Amount: t.originalAmount,
      'Exchange Rate': t.exchangeRate,
      'USD Amount': t.usdAmount,
      Description: t.description,
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Intercompany Transactions');
    writeFile(wb, `intercompany-transactions-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <>
      <PageHeader title="Intercompany" description="Cross-entity cost allocation and funding tracking">
        <MonthFilter value={month} onChange={setMonth} />
      </PageHeader>
      <PageContent>
        {/* ---- Section 1: Intercompany Report ---- */}
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">Net Position Report</h2>
        <div className="border rounded-sm bg-card overflow-hidden mb-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-sidebar border-b">
                <TableHead className="font-mono text-xs font-semibold text-sidebar-foreground">Entity</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">Actual Paid (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">True Cost (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">Difference (USD)</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">Recoverable</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right text-sidebar-foreground">Payable</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-sidebar-foreground">Net Position</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-sidebar-foreground">Brand Breakdown</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : entities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-mono text-sm">No intercompany data found</TableCell>
                </TableRow>
              ) : (
                entities.map((row: any) => (
                  <TableRow key={row.entity} className="hover:bg-muted/30">
                    <TableCell><EntityBadge entity={row.entity} /></TableCell>
                    <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={row.actualPaid || 0} /></TableCell>
                    <TableCell className="text-right font-mono text-sm"><FormatCurrency amount={row.trueCost || 0} /></TableCell>
                    <TableCell className={`text-right font-mono text-sm font-bold ${(row.difference || 0) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                      <FormatCurrency amount={row.difference || 0} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-700 dark:text-green-400">
                      {row.recoverable ? <FormatCurrency amount={row.recoverable} /> : '—'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-700 dark:text-red-400">
                      {row.payable ? <FormatCurrency amount={row.payable} /> : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                        row.netPosition === 'Overpaid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        row.netPosition === 'Underpaid' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-muted text-muted-foreground'
                      }`}>{row.netPosition}</span>
                    </TableCell>
                    <TableCell>
                      <BrandBreakdownTooltip breakdown={row.brandBreakdown || []} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* ---- Pakistan Funding Summary ---- */}
        {pkFunding && pkFunding.totalReceived > 0 && (
          <div className="mb-6 border rounded-sm bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Pakistan Funding Received (from other entities)</h3>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground">Total Received</p>
                <p className="text-xl font-bold font-mono text-green-700 dark:text-green-400"><FormatCurrency amount={pkFunding.totalReceived} /></p>
              </div>
              {pkFunding.bySource.map((s: any) => (
                <div key={s.entity}>
                  <p className="text-xs text-muted-foreground"><EntityBadge entity={s.entity} /></p>
                  <p className="text-lg font-bold font-mono"><FormatCurrency amount={s.amount} /></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Section 2: Intercompany Transactions ---- */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Intercompany Transactions</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportTx} disabled={!txList || txList.length === 0}>
              <Download className="mr-2 size-4" /> Export
            </Button>
            <Button size="sm" onClick={() => { setTxToEdit(null); setIsTxModalOpen(true); }}>
              <PlusCircle className="mr-2 size-4" /> Add Transaction
            </Button>
          </div>
        </div>
        <div className="border rounded-sm bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-mono text-xs font-semibold">Date</TableHead>
                <TableHead className="font-mono text-xs font-semibold">From Entity</TableHead>
                <TableHead className="font-mono text-xs font-semibold">To Entity</TableHead>
                <TableHead className="font-mono text-xs font-semibold">Currency</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right">Original Amount</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right">USD Amount</TableHead>
                <TableHead className="font-mono text-xs font-semibold">Description</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : !txList || txList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    No intercompany transactions recorded
                  </TableCell>
                </TableRow>
              ) : (
                (txList as any[]).map((tx: any) => (
                  <TableRow key={tx.id} className="group hover:bg-muted/30">
                    <TableCell className="font-mono text-xs">{tx.date}</TableCell>
                    <TableCell><EntityBadge entity={tx.fromEntity} /></TableCell>
                    <TableCell><EntityBadge entity={tx.toEntity} /></TableCell>
                    <TableCell className="font-mono text-xs">{tx.originalCurrency}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tx.originalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-sm"><FormatCurrency amount={tx.usdAmount} decimals={2} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.description || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-6 h-6 w-6" onClick={() => { setTxToEdit(tx); setIsTxModalOpen(true); }}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-6 h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteTx(tx.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>

      {isTxModalOpen && (
        <TransactionFormModal open={isTxModalOpen} onOpenChange={setIsTxModalOpen} txToEdit={txToEdit} />
      )}
    </>
  );
}
