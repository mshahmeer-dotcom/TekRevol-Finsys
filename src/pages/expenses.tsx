import React, { useState, useRef } from 'react';
import { useListExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useBulkImportExpenses, useBulkDeleteExpenses, useListAccounts, getListExpensesQueryKey } from '@workspace/api-client-react';
import { PageContent, PageHeader } from '@/components/layout';
import { MonthFilter } from '@/components/month-filter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Pencil, Trash2, Upload, Search, X, Plus } from 'lucide-react';
import { FormatCurrency, EntityBadge } from '@/components/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableHeader, SortState } from '@/components/column-filter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ALLOCATION_METHODS, BANKS_BY_ENTITY, COST_OWNERS, CURRENCIES, ENTITIES, ENTITY_LABELS, MONTH_NAMES, PAID_BY_ENTITY_OPTIONS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { DepartmentCombobox } from '@/components/department-combobox';

const formSchema = z.object({
  date: z.string().min(1, 'Required'),
  actualMonth: z.string().min(1, 'Required'),
  vendor: z.string().min(1, 'Required'),
  accountId: z.coerce.number().nullable().optional(),
  department: z.string().optional(),
  description: z.string().optional(),
  originalCurrency: z.string().min(1, 'Required'),
  originalAmount: z.coerce.number().min(0, 'Required'),
  exchangeRate: z.coerce.number().min(0, 'Required'),
  paidByEntity: z.string().min(1, 'Required'),
  paidFromBank: z.string().min(1, 'Required'),
  costOwner: z.string().min(1, 'Required'),
  allocationMethod: z.string().min(1, 'Required'),
  caPct: z.coerce.number().min(0).max(100),
  txPct: z.coerce.number().min(0).max(100),
  uaePct: z.coerce.number().min(0).max(100),
  pkPct: z.coerce.number().min(0).max(100),
  buzzPct: z.coerce.number().min(0).max(100),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type MonthlyAllocRow = {
  month: string;
  amount: number;
  caPct: number;
  txPct: number;
  uaePct: number;
  pkPct: number;
  buzzPct: number;
};

function defaultMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ExpenseFormModal({ open, onOpenChange, expenseToEdit, accounts }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseToEdit?: any;
  accounts: any[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const isEdit = !!expenseToEdit;

  const expenseAccounts = accounts?.filter(a => a.type === 'expense') || [];

  const getDefaultBankForEntity = (entity: string) => {
    const banks = BANKS_BY_ENTITY[entity] || [];
    return banks[0] || '';
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit ? {
      ...expenseToEdit,
      actualMonth: expenseToEdit.actualMonth || (expenseToEdit.date ? String(expenseToEdit.date).slice(0, 7) : defaultMonthStr()),
      accountId: expenseToEdit.accountId || null,
      description: expenseToEdit.description || '',
      notes: expenseToEdit.notes || '',
    } : {
      date: format(new Date(), 'yyyy-MM-dd'),
      actualMonth: defaultMonthStr(),
      vendor: '',
      accountId: null,
      department: '',
      description: '',
      originalCurrency: 'USD',
      originalAmount: 0,
      exchangeRate: 1,
      paidByEntity: 'PK',
      paidFromBank: getDefaultBankForEntity('PK'),
      costOwner: 'Shared',
      allocationMethod: 'Percentage',
      caPct: 25, txPct: 25, uaePct: 25, pkPct: 25, buzzPct: 0,
      notes: '',
    },
  });

  const [monthlyAllocs, setMonthlyAllocs] = useState<MonthlyAllocRow[]>(
    isEdit && Array.isArray(expenseToEdit?.monthlyAllocations) ? expenseToEdit.monthlyAllocations : []
  );

  const watchedEntity = form.watch('paidByEntity');
  const watchedAccountId = form.watch('accountId');
  const watchedMethod = form.watch('allocationMethod');
  const isLocked = watchedMethod === 'Equal Split';

  // When entity changes, reset bank to entity's first bank
  React.useEffect(() => {
    const banks = BANKS_BY_ENTITY[watchedEntity] || [];
    if (banks.length > 0) form.setValue('paidFromBank', banks[0]);
  }, [watchedEntity]);

  // Equal split auto-fill
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'allocationMethod' && value.allocationMethod === 'Equal Split') {
        form.setValue('caPct', 20);
        form.setValue('txPct', 20);
        form.setValue('uaePct', 20);
        form.setValue('pkPct', 20);
        form.setValue('buzzPct', 20);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Derive selected account's category for display
  const selectedAccount = expenseAccounts.find(a => a.id === Number(watchedAccountId));
  const derivedCategory = selectedAccount ? selectedAccount.category : (expenseToEdit?.accountCategory || expenseToEdit?.expenseCategory || '');

  const availableBanks = BANKS_BY_ENTITY[watchedEntity] || [];

  const addMonthlyAllocRow = () => {
    setMonthlyAllocs(prev => [...prev, {
      month: defaultMonthStr(), amount: 0,
      caPct: form.getValues('caPct'), txPct: form.getValues('txPct'),
      uaePct: form.getValues('uaePct'), pkPct: form.getValues('pkPct'),
      buzzPct: form.getValues('buzzPct'),
    }]);
  };

  const removeMonthlyAllocRow = (idx: number) => {
    setMonthlyAllocs(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMonthlyAllocRow = (idx: number, field: keyof MonthlyAllocRow, val: string | number) => {
    setMonthlyAllocs(prev => prev.map((row, i) => i === idx ? { ...row, [field]: typeof val === 'string' && field !== 'month' ? Number(val) : val } : row));
  };

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, monthlyAllocations: monthlyAllocs };
    if (isEdit) {
      updateExpense.mutate({ id: expenseToEdit.id, data: payload }, {
        onSuccess: () => {
          toast({ title: 'Expense updated' });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          onOpenChange(false);
        },
      });
    } else {
      createExpense.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: 'Expense created' });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Expense' : 'Add New Expense'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Date, Actual Month, Expense Name */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Entry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="actualMonth" render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Month</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vendor" render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Expense Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Free-text description (e.g. AWS Hosting Q1)" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 2: Expense Type, Expense Category (derived), Department */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="accountId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Type</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : Number(v))}
                    value={field.value ? String(field.value) : '__none__'}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {expenseAccounts.map(a => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                      {expenseAccounts.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">No expense types — add in Chart of Accounts</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div>
                 <Label className="text-sm font-medium">Expense Category</Label>
                <div className="mt-2 border rounded-md px-3 py-2 text-sm bg-muted/30 text-muted-foreground min-h-[36px]">
                  {derivedCategory || <span className="italic">Auto-derived from Expense Type</span>}
                </div>
              </div>
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl><DepartmentCombobox value={field.value} onChange={field.onChange} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 3: Description */}
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Input {...field} placeholder="Additional details" /></FormControl><FormMessage /></FormItem>
            )} />

            {/* Row 4: Currency / Amount section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-md">
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
                <FormItem><FormLabel>Exch. Rate (to USD)</FormLabel><FormControl><Input type="number" step="0.00001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="pt-8">
                <span className="text-sm font-medium text-muted-foreground">USD Eqv: </span>
                <span className="font-mono font-bold"><FormatCurrency amount={(form.watch('originalAmount') || 0) * (form.watch('exchangeRate') || 1)} decimals={2} /></span>
              </div>
            </div>

            {/* Row 5: Paid By Entity, Paid From Bank (entity-filtered), Cost Owner */}
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="paidByEntity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By Entity</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {PAID_BY_ENTITY_OPTIONS.map(e => (
                        <SelectItem key={e} value={e}>{ENTITY_LABELS[e] || e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="paidFromBank" render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid From Bank</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {availableBanks.length === 0
                        ? <SelectItem value="">No banks configured</SelectItem>
                        : availableBanks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)
                      }
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="costOwner" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Owner</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{COST_OWNERS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Row 6: Allocation */}
            <div className="border border-border rounded-md p-4 space-y-4">
              <h4 className="text-sm font-semibold">Brand Allocation (CA + TX + UAE + PK + BuzzFlick = 100%)</h4>
              <div className="grid grid-cols-6 gap-3">
                <FormField control={form.control} name="allocationMethod" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{ALLOCATION_METHODS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {([
                  { name: 'caPct', label: 'CA %' },
                  { name: 'txPct', label: 'TX %' },
                  { name: 'uaePct', label: 'AE %' },
                  { name: 'pkPct', label: 'PK %' },
                  { name: 'buzzPct', label: 'Buzz %' },
                ] as const).map(({ name, label }) => (
                  <FormField key={name} control={form.control} name={name} render={({ field }) => (
                    <FormItem><FormLabel>{label}</FormLabel><FormControl><Input type="number" step="0.1" {...field} disabled={isLocked} /></FormControl><FormMessage /></FormItem>
                  )} />
                ))}
              </div>
            </div>

            {/* Row 7: Monthly Allocation Splits (optional) */}
            <div className="border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Monthly Allocation Splits <span className="font-normal text-muted-foreground">(optional — overrides single Actual Month)</span></h4>
                <Button type="button" variant="outline" size="sm" onClick={addMonthlyAllocRow}>
                  <Plus className="mr-1 size-3" /> Add Month
                </Button>
              </div>
              {monthlyAllocs.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-9 gap-2 text-xs font-mono text-muted-foreground px-1">
                    <div className="col-span-2">Month</div>
                    <div>Amount (USD)</div>
                    <div>CA %</div>
                    <div>TX %</div>
                    <div>AE %</div>
                    <div>PK %</div>
                    <div>Buzz %</div>
                    <div></div>
                  </div>
                  {monthlyAllocs.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-9 gap-2 items-center">
                      <Input type="month" className="col-span-2 text-xs h-8" value={row.month} onChange={e => updateMonthlyAllocRow(idx, 'month', e.target.value)} />
                      <Input type="number" step="0.01" className="text-xs h-8" value={row.amount} onChange={e => updateMonthlyAllocRow(idx, 'amount', e.target.value)} />
                      <Input type="number" step="0.1" className="text-xs h-8" value={row.caPct} onChange={e => updateMonthlyAllocRow(idx, 'caPct', e.target.value)} />
                      <Input type="number" step="0.1" className="text-xs h-8" value={row.txPct} onChange={e => updateMonthlyAllocRow(idx, 'txPct', e.target.value)} />
                      <Input type="number" step="0.1" className="text-xs h-8" value={row.uaePct} onChange={e => updateMonthlyAllocRow(idx, 'uaePct', e.target.value)} />
                      <Input type="number" step="0.1" className="text-xs h-8" value={row.pkPct} onChange={e => updateMonthlyAllocRow(idx, 'pkPct', e.target.value)} />
                      <Input type="number" step="0.1" className="text-xs h-8" value={row.buzzPct} onChange={e => updateMonthlyAllocRow(idx, 'buzzPct', e.target.value)} />
                      <Button type="button" variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => removeMonthlyAllocRow(idx)}>
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1">
                    Total split: <span className="font-mono font-bold"><FormatCurrency amount={monthlyAllocs.reduce((s, r) => s + (r.amount || 0), 0)} decimals={2} /></span>
                    {' '}/ entry USD: <span className="font-mono font-bold"><FormatCurrency amount={(form.watch('originalAmount') || 0) * (form.watch('exchangeRate') || 1)} decimals={2} /></span>
                  </p>
                </div>
              )}
              {monthlyAllocs.length === 0 && (
                <p className="text-xs text-muted-foreground">No monthly splits — full amount booked to Actual Month above.</p>
              )}
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending}>
                {isEdit ? 'Update Expense' : 'Create Expense'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Expenses() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [importSummary, setImportSummary] = useState<{ totalRows: number; successCount: number; failedCount: number; errors: { row: number; reason: string }[] } | null>(null);

  const { data: expenses, isLoading } = useListExpenses({ month }, { query: { queryKey: ['expenses', month] } });
  const { data: accounts } = useListAccounts({ type: 'expense' }, { query: { queryKey: ['accounts', 'expense'] } });
  const deleteExpense = useDeleteExpense();
  const bulkImport = useBulkImportExpenses();
  const bulkDelete = useBulkDeleteExpenses();
  const queryClient = useQueryClient();

  const filterOptionsFor = (key: string) => {
    const all = (expenses || []) as any[];
    return [...new Set(all.map(r => String(r[key] ?? '')))].sort();
  };

  const setFilter = (key: string, next: Set<string>) => {
    setFilters(prev => ({ ...prev, [key]: next }));
  };

  const handleSort = (key: string) => {
    setSort(prev => {
      if (prev?.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const displayedExpenses = React.useMemo(() => {
    let rows = [...((expenses || []) as any[])];

    for (const [key, values] of Object.entries(filters)) {
      if (values && values.size > 0) {
        rows = rows.filter(r => values.has(String(r[key] ?? '')));
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        [r.date, r.actualMonth, r.vendor, r.accountName, r.expenseCategory, r.department, r.description, r.paidByEntity, r.paidFromBank, r.notes]
          .some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }

    if (sort) {
      rows.sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        let cmp = 0;
        if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
        else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }

    return rows;
  }, [expenses, filters, search, sort]);

  const selectedTotal = React.useMemo(() => {
    return displayedExpenses.filter(r => selectedIds.has(r.id)).reduce((s, r) => s + (r.usdAmount || 0), 0);
  }, [displayedExpenses, selectedIds]);

  const allSelected = displayedExpenses.length > 0 && displayedExpenses.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayedExpenses.map(r => r.id)));
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected expense entries?`)) return;
    bulkDelete.mutate({ ids: [...selectedIds] }, {
      onSuccess: () => {
        toast({ title: `Deleted ${selectedIds.size} entries` });
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
      },
    });
  };

  const handleEdit = (expense: any) => { setExpenseToEdit(expense); setIsModalOpen(true); };
  const handleCreate = () => { setExpenseToEdit(null); setIsModalOpen(true); };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      deleteExpense.mutate({ id }, {
        onSuccess: () => { toast({ title: 'Expense deleted' }); queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() }); },
      });
    }
  };

  const handleExport = async () => {
    const { utils, writeFile } = await import('xlsx');
    const rows = (expenses || []) as any[];
    const ws = utils.json_to_sheet(rows.map(e => ({
      'Entry Date': e.date,
      'Actual Month': e.actualMonth,
      'Expense Name': e.vendor,
      'Expense Type': e.accountName || e.expenseCategory,
      'Expense Category': e.accountCategory || e.expenseCategory,
      Department: e.department,
      Description: e.description,
      Currency: e.originalCurrency,
      Amount: e.originalAmount,
      'Exchange Rate': e.exchangeRate,
      'USD Amount': e.usdAmount,
      'Paid By Entity': e.paidByEntity,
      'Paid From Bank': e.paidFromBank,
      'Cost Owner': e.costOwner,
      'Allocation Method': e.allocationMethod,
      'CA%': e.caPct, 'TX%': e.txPct, 'AE%': e.uaePct, 'PK%': e.pkPct, 'Buzz%': e.buzzPct,
      Notes: e.notes,
      'Monthly Splits': Array.isArray(e.monthlyAllocations) && e.monthlyAllocations.length > 0
        ? JSON.stringify(e.monthlyAllocations) : '',
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Expenses');
    writeFile(wb, `expenses-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleDownloadTemplate = async () => {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet([{
      'Entry Date': '2025-01-15',
      'Actual Month': '2025-01',
      'Expense Name': 'AWS Hosting Jan 2025',
      'Expense Type': 'Software Subscriptions',
      'Expense Category': 'Technology',
      Department: 'Engineering',
      Description: 'Cloud hosting fees',
      Currency: 'USD',
      Amount: 5000,
      'Exchange Rate': 1,
      'Paid By Entity': 'PK',
      'Paid From Bank': 'Meezan Bank',
      'Cost Owner': 'Shared',
      'Allocation Method': 'Percentage',
      'CA%': 25, 'TX%': 25, 'AE%': 25, 'PK%': 25, 'Buzz%': 0,
      Notes: '',
    }]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Expenses');
    writeFile(wb, 'expenses-import-template.xlsx');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { read, utils } = await import('xlsx');
      const ab = await file.arrayBuffer();
      const wb = read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = utils.sheet_to_json(ws) as any[];
      const rows = raw.map(r => ({
        date: r['Entry Date'] || r['Date'] || '',
        actualMonth: r['Actual Month'] || '',
        vendor: r['Expense Name'] || r['Vendor'] || '',
        expenseType: r['Expense Type'] || r['Category'] || '',
        expenseCategory: r['Expense Category'] || r['Category'] || '',
        department: r['Department'] || '',
        description: r['Description'] || '',
        originalCurrency: r['Currency'] || 'USD',
        originalAmount: Number(r['Amount'] || 0),
        exchangeRate: Number(r['Exchange Rate'] || 1),
        paidByEntity: r['Paid By Entity'] || 'PK',
        paidFromBank: r['Paid From Bank'] || 'Meezan Bank',
        costOwner: r['Cost Owner'] || 'Shared',
        allocationMethod: r['Allocation Method'] || 'Percentage',
        caPct: Number(r['CA%'] || 0),
        txPct: Number(r['TX%'] || 0),
        uaePct: Number(r['AE%'] || r['UAE%'] || 0),
        pkPct: Number(r['PK%'] || 0),
        buzzPct: Number(r['Buzz%'] || 0),
        notes: r['Notes'] || '',
      })).filter(r => r.date && r.vendor);

      if (rows.length === 0) { toast({ title: 'No valid rows found', variant: 'destructive' }); return; }

      bulkImport.mutate({ rows }, {
        onSuccess: (res) => {
          setImportSummary(res);
          if (res.successCount > 0) {
            toast({ title: `Imported ${res.successCount} of ${res.totalRows} rows` });
            queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          }
          if (res.failedCount > 0) {
            toast({ title: `${res.failedCount} row(s) failed validation`, variant: 'destructive' });
          }
        },
        onError: () => toast({ title: 'Import failed', variant: 'destructive' }),
      });
    } catch {
      toast({ title: 'Failed to read file', variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <PageHeader title="Master Expense Entry" description="Record and allocate all company expenses">
        <MonthFilter value={month} onChange={setMonth} />
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="mr-2 size-4" /> Template</Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 size-4" /> Import</Button>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 size-4" /> Export</Button>
        <Button onClick={handleCreate} size="sm"><PlusCircle className="mr-2 size-4" /> Add Expense</Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
      </PageHeader>
      <PageContent>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses…"
              className="pl-8 pr-8"
            />
            {search && (
              <button className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}>
                <X className="size-4" />
              </button>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 ml-auto font-mono text-xs bg-muted/50 border rounded-sm px-3 py-2">
              <span>{selectedIds.size} selected</span>
              <span className="font-bold text-green-700 dark:text-green-400"><FormatCurrency amount={selectedTotal} decimals={2} /></span>
              <Button variant="destructive" size="sm" className="h-6 px-2" onClick={handleBulkDelete}>
                <Trash2 className="mr-1 size-3" /> Delete
              </Button>
            </div>
          )}
        </div>
        <div className="border rounded-sm bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[40px]"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} /></TableHead>
                <TableHead className="font-mono text-xs font-semibold">
                  <SortableHeader label="Actual Month" sortKey="actualMonth" sort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">
                  <SortableHeader label="Expense Name" sortKey="vendor" sort={sort} onSort={handleSort}
                    filterOptions={filterOptionsFor('vendor')} filterSelected={filters.vendor || new Set()} onFilterChange={(s) => setFilter('vendor', s)} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">
                  <SortableHeader label="Expense Type" sortKey="accountName" sort={sort} onSort={handleSort}
                    filterOptions={filterOptionsFor('accountName')} filterSelected={filters.accountName || new Set()} onFilterChange={(s) => setFilter('accountName', s)} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">
                  <SortableHeader label="Category" sortKey="expenseCategory" sort={sort} onSort={handleSort}
                    filterOptions={filterOptionsFor('expenseCategory')} filterSelected={filters.expenseCategory || new Set()} onFilterChange={(s) => setFilter('expenseCategory', s)} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">
                  <SortableHeader label="Dept" sortKey="department" sort={sort} onSort={handleSort}
                    filterOptions={filterOptionsFor('department')} filterSelected={filters.department || new Set()} onFilterChange={(s) => setFilter('department', s)} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">
                  <SortableHeader label="Paid By" sortKey="paidByEntity" sort={sort} onSort={handleSort}
                    filterOptions={filterOptionsFor('paidByEntity')} filterSelected={filters.paidByEntity || new Set()} onFilterChange={(s) => setFilter('paidByEntity', s)} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right">
                  <SortableHeader label="Amount (USD)" sortKey="usdAmount" sort={sort} onSort={handleSort} className="justify-end" />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">Allocation</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : displayedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground font-mono text-sm">No expenses found</TableCell>
                </TableRow>
              ) : (
                displayedExpenses.map((ex) => (
                  <TableRow key={ex.id} className="group" data-state={selectedIds.has(ex.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox checked={selectedIds.has(ex.id)} onCheckedChange={() => toggleSelectRow(ex.id)} /></TableCell>
                    <TableCell className="font-mono text-xs">{ex.actualMonth || ex.date?.slice(0, 7)}</TableCell>
                    <TableCell className="font-medium text-sm max-w-[140px] truncate" title={ex.vendor}>{ex.vendor}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ex.accountName || ex.expenseCategory || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ex.accountCategory || ex.expenseCategory || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ex.department || '—'}</TableCell>
                    <TableCell><EntityBadge entity={ex.paidByEntity} /></TableCell>
                    <TableCell className="text-right font-bold text-sm"><FormatCurrency amount={ex.usdAmount} decimals={2} /></TableCell>
                    <TableCell className="text-xs">
                      {ex.allocationMethod === 'Direct' ? (
                        <span className="text-muted-foreground">{ex.costOwner}</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {ex.caPct > 0 && <span className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">CA:{ex.caPct}%</span>}
                          {ex.txPct > 0 && <span className="text-[10px] text-red-600 bg-red-50 px-1 rounded">TX:{ex.txPct}%</span>}
                          {ex.uaePct > 0 && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">AE:{ex.uaePct}%</span>}
                          {ex.pkPct > 0 && <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded">PK:{ex.pkPct}%</span>}
                          {ex.buzzPct > 0 && <span className="text-[10px] text-purple-600 bg-purple-50 px-1 rounded">Buzz:{ex.buzzPct}%</span>}
                          {Array.isArray(ex.monthlyAllocations) && ex.monthlyAllocations.length > 0 && (
                            <span className="text-[10px] bg-muted px-1 rounded text-muted-foreground">{ex.monthlyAllocations.length}mo</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-6 h-6 w-6" onClick={() => handleEdit(ex)}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-6 h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(ex.id)}>
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

      {isModalOpen && (
        <ExpenseFormModal open={isModalOpen} onOpenChange={setIsModalOpen} expenseToEdit={expenseToEdit} accounts={accounts || []} />
      )}

      <Dialog open={!!importSummary} onOpenChange={(o) => !o && setImportSummary(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Summary</DialogTitle>
            <DialogDescription>Results of the expense import</DialogDescription>
          </DialogHeader>
          {importSummary && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md border p-3">
                  <div className="text-2xl font-bold">{importSummary.totalRows}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </div>
                <div className="rounded-md border p-3 border-green-200 bg-green-50">
                  <div className="text-2xl font-bold text-green-700">{importSummary.successCount}</div>
                  <div className="text-xs text-muted-foreground">Succeeded</div>
                </div>
                <div className="rounded-md border p-3 border-red-200 bg-red-50">
                  <div className="text-2xl font-bold text-red-700">{importSummary.failedCount}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>
              {importSummary.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {importSummary.errors.map((err, i) => (
                    <div key={i} className="text-xs bg-red-50 border border-red-200 rounded px-2 py-1">
                      <span className="font-mono font-semibold">Row {err.row}:</span> {err.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImportSummary(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
