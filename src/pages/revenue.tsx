import React, { useState, useRef } from 'react';
import { useListRevenue, useCreateRevenue, useUpdateRevenue, useDeleteRevenue, useBulkImportRevenue, useBulkDeleteRevenue, getListRevenueQueryKey } from '@workspace/api-client-react';
import { PageContent, PageHeader } from '@/components/layout';
import { MonthFilter } from '@/components/month-filter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Pencil, Trash2, Upload, Search, X, Plus } from 'lucide-react';
import { FormatCurrency, EntityBadge, RevenueTypeBadge } from '@/components/formatters';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableHeader, SortState } from '@/components/column-filter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CURRENCIES, REVENUE_BRANDS, REVENUE_TYPES, ENTITIES, ENTITY_LABELS, CASH_RECEIVED_IN_OPTIONS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  date: z.string().min(1, 'Required'),
  actualMonth: z.string().min(1, 'Required'),
  brand: z.string().min(1, 'Required'),
  projectName: z.string().optional(),
  client: z.string().min(1, 'Required'),
  revenueType: z.string().min(1, 'Required'),
  cashReceivedIn: z.string().optional(),
  originalCurrency: z.string().min(1, 'Required'),
  originalAmount: z.coerce.number().min(0, 'Required'),
  exchangeRate: z.coerce.number().min(0, 'Required'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type MonthlyAllocRow = { month: string; amount: number };

function defaultMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function RevenueFormModal({
  open, onOpenChange, entryToEdit, existingClients,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; entryToEdit?: any; existingClients: string[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createRevenue = useCreateRevenue();
  const updateRevenue = useUpdateRevenue();
  const isEdit = !!entryToEdit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit ? {
      ...entryToEdit,
      actualMonth: entryToEdit.actualMonth || (entryToEdit.date ? String(entryToEdit.date).slice(0, 7) : defaultMonthStr()),
      notes: entryToEdit.notes || '',
      projectName: entryToEdit.projectName || '',
      cashReceivedIn: entryToEdit.cashReceivedIn || '',
    } : {
      date: format(new Date(), 'yyyy-MM-dd'),
      actualMonth: defaultMonthStr(),
      brand: 'CA',
      projectName: '',
      client: '',
      revenueType: 'Fresh',
      cashReceivedIn: '',
      originalCurrency: 'USD',
      originalAmount: 0,
      exchangeRate: 1,
      notes: '',
    },
  });

  const [monthlyAllocs, setMonthlyAllocs] = useState<MonthlyAllocRow[]>(
    isEdit && Array.isArray(entryToEdit?.monthlyAllocations) ? entryToEdit.monthlyAllocations : []
  );

  const watchedClient = form.watch('client');
  const isExistingClient = watchedClient.trim() && existingClients.includes(watchedClient.trim());

  React.useEffect(() => {
    if (!isEdit && watchedClient.trim()) {
      const isExisting = existingClients.includes(watchedClient.trim());
      form.setValue('revenueType', isExisting ? 'Recurring' : 'Fresh');
    }
  }, [watchedClient]);

  const addMonthlyAllocRow = () => {
    setMonthlyAllocs(prev => [...prev, { month: defaultMonthStr(), amount: 0 }]);
  };

  const removeMonthlyAllocRow = (idx: number) => {
    setMonthlyAllocs(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMonthlyAllocRow = (idx: number, field: keyof MonthlyAllocRow, val: string | number) => {
    setMonthlyAllocs(prev => prev.map((row, i) => i === idx ? { ...row, [field]: field === 'month' ? val : Number(val) } : row));
  };

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, monthlyAllocations: monthlyAllocs };
    if (isEdit) {
      updateRevenue.mutate({ id: entryToEdit.id, data: payload }, {
        onSuccess: () => {
          toast({ title: 'Revenue updated' });
          queryClient.invalidateQueries({ queryKey: getListRevenueQueryKey() });
          onOpenChange(false);
        },
      });
    } else {
      createRevenue.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: 'Revenue created' });
          queryClient.invalidateQueries({ queryKey: getListRevenueQueryKey() });
          onOpenChange(false);
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Revenue' : 'Add New Revenue'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem><FormLabel>Entry Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="actualMonth" render={({ field }) => (
                <FormItem><FormLabel>Actual Month</FormLabel><FormControl><Input type="month" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{REVENUE_BRANDS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cashReceivedIn" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cash Received In</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select entity…" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">— Not set —</SelectItem>
                      {CASH_RECEIVED_IN_OPTIONS.map(e => (
                        <SelectItem key={e} value={e}>{ENTITY_LABELS[e] || e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="projectName" render={({ field }) => (
              <FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} placeholder="Project or engagement name" /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="client" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <FormControl><Input {...field} placeholder="Client / company name" /></FormControl>
                  {!isEdit && isExistingClient && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">Returning client — defaulting to Recurring</p>
                  )}
                  {!isEdit && watchedClient.trim() && !isExistingClient && (
                    <p className="text-xs text-green-600 dark:text-green-400">New client — defaulting to Fresh</p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="revenueType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {REVENUE_TYPES.map(t => (
                        <SelectItem key={t} value={t} disabled={t === 'Fresh' && !!isExistingClient && !isEdit}>
                          {t}{t === 'Fresh' && isExistingClient && !isEdit ? ' (existing client)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4 bg-muted/30 p-4 rounded-md">
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
            </div>

            {/* Monthly Allocation Splits */}
            <div className="border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Monthly Revenue Splits <span className="font-normal text-muted-foreground">(optional)</span></h4>
                <Button type="button" variant="outline" size="sm" onClick={addMonthlyAllocRow}>
                  <Plus className="mr-1 size-3" /> Add Month
                </Button>
              </div>
              {monthlyAllocs.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-muted-foreground px-1">
                    <div>Month</div><div>Amount (USD)</div><div></div>
                  </div>
                  {monthlyAllocs.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 items-center">
                      <Input type="month" className="text-xs h-8" value={row.month} onChange={e => updateMonthlyAllocRow(idx, 'month', e.target.value)} />
                      <Input type="number" step="0.01" className="text-xs h-8" value={row.amount} onChange={e => updateMonthlyAllocRow(idx, 'amount', e.target.value)} />
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
              <Button type="submit" disabled={createRevenue.isPending || updateRevenue.isPending}>
                {isEdit ? 'Update Revenue' : 'Create Revenue'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Revenue() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: revenue, isLoading } = useListRevenue({ month }, { query: { queryKey: ['revenue', month] } });
  const deleteRevenue = useDeleteRevenue();
  const bulkImport = useBulkImportRevenue();
  const bulkDelete = useBulkDeleteRevenue();
  const queryClient = useQueryClient();

  const existingClients = React.useMemo(() => {
    const all = (revenue || []) as any[];
    return [...new Set(all.map(r => r.client))];
  }, [revenue]);

  const filterOptionsFor = (key: string) => {
    const all = (revenue || []) as any[];
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

  const displayedRevenue = React.useMemo(() => {
    let rows = [...((revenue || []) as any[])];

    for (const [key, values] of Object.entries(filters)) {
      if (values && values.size > 0) {
        rows = rows.filter(r => values.has(String(r[key] ?? '')));
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        [r.date, r.actualMonth, r.brand, r.projectName, r.client, r.revenueType, r.cashReceivedIn, r.originalCurrency, r.notes]
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
  }, [revenue, filters, search, sort]);

  const selectedTotal = React.useMemo(() => {
    return displayedRevenue.filter(r => selectedIds.has(r.id)).reduce((s, r) => s + (r.usdAmount || 0), 0);
  }, [displayedRevenue, selectedIds]);

  const allSelected = displayedRevenue.length > 0 && displayedRevenue.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayedRevenue.map(r => r.id)));
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
    if (!confirm(`Delete ${selectedIds.size} selected revenue entries?`)) return;
    bulkDelete.mutate({ ids: [...selectedIds] }, {
      onSuccess: () => {
        toast({ title: `Deleted ${selectedIds.size} entries` });
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: getListRevenueQueryKey() });
      },
    });
  };

  const handleEdit = (entry: any) => { setEntryToEdit(entry); setIsModalOpen(true); };
  const handleCreate = () => { setEntryToEdit(null); setIsModalOpen(true); };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this revenue entry?')) {
      deleteRevenue.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'Revenue deleted' });
          queryClient.invalidateQueries({ queryKey: getListRevenueQueryKey() });
        },
      });
    }
  };

  const handleExport = async () => {
    const { utils, writeFile } = await import('xlsx');
    const rows = (revenue || []) as any[];
    const ws = utils.json_to_sheet(rows.map(r => ({
      'Entry Date': r.date,
      'Actual Month': r.actualMonth,
      Brand: r.brand,
      'Project Name': r.projectName,
      Client: r.client,
      'Revenue Type': r.revenueType,
      'Cash Received In': r.cashReceivedIn,
      Currency: r.originalCurrency,
      Amount: r.originalAmount,
      'Exchange Rate': r.exchangeRate,
      'USD Amount': r.usdAmount,
      Notes: r.notes,
      'Monthly Splits': Array.isArray(r.monthlyAllocations) && r.monthlyAllocations.length > 0
        ? JSON.stringify(r.monthlyAllocations) : '',
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Revenue');
    writeFile(wb, `revenue-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleDownloadTemplate = async () => {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet([{
      'Entry Date': '2025-01-15',
      'Actual Month': '2025-01',
      Brand: 'CA',
      'Project Name': 'Sample Project',
      Client: 'Acme Corp',
      'Revenue Type': 'Fresh',
      'Cash Received In': 'CA',
      Currency: 'USD',
      Amount: 10000,
      'Exchange Rate': 1,
      Notes: '',
    }]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Revenue');
    writeFile(wb, 'revenue-import-template.xlsx');
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
        date: r['Entry Date'] || r['Date'] || r['date'] || '',
        actualMonth: r['Actual Month'] || r['actualMonth'] || '',
        brand: r['Brand'] || r['brand'] || 'CA',
        projectName: r['Project Name'] || r['projectName'] || '',
        client: r['Client'] || r['client'] || '',
        revenueType: r['Revenue Type'] || r['revenueType'] || 'Fresh',
        cashReceivedIn: r['Cash Received In'] || r['cashReceivedIn'] || '',
        originalCurrency: r['Currency'] || r['originalCurrency'] || 'USD',
        originalAmount: Number(r['Amount'] || r['originalAmount'] || 0),
        exchangeRate: Number(r['Exchange Rate'] || r['exchangeRate'] || 1),
        notes: r['Notes'] || r['notes'] || '',
      })).filter(r => r.date && r.client);

      if (rows.length === 0) { toast({ title: 'No valid rows found', variant: 'destructive' }); return; }

      bulkImport.mutate({ rows }, {
        onSuccess: (res) => {
          const inserted = res.inserted || res.successCount || 0;
          toast({ title: `Imported ${inserted} rows` });
          queryClient.invalidateQueries({ queryKey: getListRevenueQueryKey() });
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
      <PageHeader title="Revenue Entry" description="Record client payments and inbound revenue">
        <MonthFilter value={month} onChange={setMonth} />
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="mr-2 size-4" /> Template</Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 size-4" /> Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 size-4" /> Export</Button>
        <Button onClick={handleCreate} size="sm"><PlusCircle className="mr-2 size-4" /> Add Revenue</Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
      </PageHeader>
      <PageContent>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search revenue entries…"
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
                  <SortableHeader label="Brand" sortKey="brand" sort={sort} onSort={handleSort}
                    filterOptions={filterOptionsFor('brand')} filterSelected={filters.brand || new Set()} onFilterChange={(s) => setFilter('brand', s)} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">
                  <SortableHeader label="Project Name" sortKey="projectName" sort={sort} onSort={handleSort} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">
                  <SortableHeader label="Client" sortKey="client" sort={sort} onSort={handleSort}
                    filterOptions={filterOptionsFor('client')} filterSelected={filters.client || new Set()} onFilterChange={(s) => setFilter('client', s)} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">
                  <SortableHeader label="Type" sortKey="revenueType" sort={sort} onSort={handleSort}
                    filterOptions={filterOptionsFor('revenueType')} filterSelected={filters.revenueType || new Set()} onFilterChange={(s) => setFilter('revenueType', s)} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold">Cash In</TableHead>
                <TableHead className="font-mono text-xs font-semibold text-right">
                  <SortableHeader label="Amount (USD)" sortKey="usdAmount" sort={sort} onSort={handleSort} className="justify-end" />
                </TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                  </TableRow>
                ))
              ) : displayedRevenue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    No revenue entries found
                  </TableCell>
                </TableRow>
              ) : (
                displayedRevenue.map((ex) => (
                  <TableRow key={ex.id} className="group" data-state={selectedIds.has(ex.id) ? 'selected' : undefined}>
                    <TableCell><Checkbox checked={selectedIds.has(ex.id)} onCheckedChange={() => toggleSelectRow(ex.id)} /></TableCell>
                    <TableCell className="font-mono text-xs">{ex.actualMonth || ex.date?.slice(0, 7)}</TableCell>
                    <TableCell><EntityBadge entity={ex.brand} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ex.projectName || '—'}</TableCell>
                    <TableCell className="font-medium text-sm">{ex.client}</TableCell>
                    <TableCell><RevenueTypeBadge type={ex.revenueType} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ex.cashReceivedIn || '—'}</TableCell>
                    <TableCell className="text-right font-bold text-sm text-green-700 dark:text-green-400">
                      <FormatCurrency amount={ex.usdAmount} decimals={2} />
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
        <RevenueFormModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          entryToEdit={entryToEdit}
          existingClients={existingClients}
        />
      )}
    </>
  );
}
