import React, { useState, useRef } from 'react';
import { useListAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useBulkImportAccounts, useBulkDeleteAccounts, getListAccountsQueryKey } from '@workspace/api-client-react';
import { PageContent, PageHeader } from '@/components/layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, Download, Upload, Search, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { ACCOUNT_TYPES } from '@/lib/constants';
import { format } from 'date-fns';

const formSchema = z.object({
  code: z.string().min(1, "Required"),
  category: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  type: z.string().min(1, "Required"),
  description: z.string().optional(),
});

function AccountFormModal({ open, onOpenChange, entryToEdit }: { open: boolean, onOpenChange: (open: boolean) => void, entryToEdit?: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const isEdit = !!entryToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit ? {
      ...entryToEdit,
      description: entryToEdit.description || '',
    } : {
      code: '',
      category: '',
      name: '',
      type: 'expense',
      description: '',
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isEdit) {
      updateAccount.mutate({ id: entryToEdit.id, data: values }, {
        onSuccess: () => {
          toast({ title: 'Account updated' });
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          onOpenChange(false);
        }
      });
    } else {
      createAccount.mutate({ data: values }, {
        onSuccess: () => {
          toast({ title: 'Account created' });
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
          onOpenChange(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : 'Add New Account'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Code</FormLabel><FormControl><Input {...field} placeholder="e.g. 5001" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{ACCOUNT_TYPES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Expense Category</FormLabel><FormControl><Input {...field} placeholder="e.g. Technology, Payroll, Operations" /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Expense Type</FormLabel><FormControl><Input {...field} placeholder="e.g. Software Subscriptions, Engineering Salaries" /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createAccount.isPending || updateAccount.isPending}>
                {isEdit ? 'Update Account' : 'Create Account'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Accounts() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [importSummary, setImportSummary] = useState<{ totalRows: number; successCount: number; failedCount: number; errors: { row: number; reason: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accounts, isLoading } = useListAccounts({}, { query: { queryKey: ['accounts'] } });
  const deleteAccount = useDeleteAccount();
  const bulkImport = useBulkImportAccounts();
  const bulkDelete = useBulkDeleteAccounts();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const displayedAccounts = React.useMemo(() => {
    let rows = [...((accounts || []) as any[])];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        [r.name, r.code, r.category, r.description].some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    return rows;
  }, [accounts, search]);

  const allSelected = displayedAccounts.length > 0 && displayedAccounts.every(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayedAccounts.map(r => r.id)));
  };

  const toggleSelectRow = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEdit = (entry: any) => {
    setEntryToEdit(entry);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEntryToEdit(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this account?")) {
      deleteAccount.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'Account deleted' });
          queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
        }
      });
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected account(s)? This cannot be undone.`)) return;
    bulkDelete.mutate({ ids: [...selectedIds] }, {
      onSuccess: () => {
        toast({ title: `Deleted ${selectedIds.size} account(s)` });
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
      },
    });
  };

  const handleExport = async () => {
    const { utils, writeFile } = await import('xlsx');
    const rows = (accounts || []) as any[];
    const ws = utils.json_to_sheet(rows.map(r => ({
      Code: r.code, Type: r.type, Category: r.category, Name: r.name, Description: r.description,
    })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Chart of Accounts');
    writeFile(wb, `chart-of-accounts-export-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleDownloadTemplate = async () => {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet([{
      Code: '5001', Type: 'expense', Category: 'Payroll', Name: 'Engineering Salaries', Description: '',
    }]);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Chart of Accounts');
    writeFile(wb, 'chart-of-accounts-import-template.xlsx');
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
        code: r['Code'] || r['code'] || '',
        type: r['Type'] || r['type'] || '',
        category: r['Category'] || r['category'] || '',
        name: r['Name'] || r['name'] || '',
        description: r['Description'] || r['description'] || '',
      }));

      if (rows.length === 0) { toast({ title: 'No rows found in file', variant: 'destructive' }); return; }

      bulkImport.mutate({ rows }, {
        onSuccess: (res) => {
          setImportSummary(res);
          if (res.successCount > 0) {
            toast({ title: `Imported ${res.successCount} of ${res.totalRows} rows` });
            queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey() });
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
      <PageHeader title="Chart of Accounts" description="Manage revenue and expense categories">
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}><Download className="mr-2 size-4" /> Template</Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 size-4" /> Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 size-4" /> Export</Button>
        <Button onClick={handleCreate} size="sm"><PlusCircle className="mr-2 size-4" /> Add Account</Button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
      </PageHeader>
      <PageContent>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, or category..."
              className="pl-8 pr-8"
            />
            {search && (
              <button className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}>
                <X className="size-4" />
              </button>
            )}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">{selectedIds.size} selected</span>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 size-4" /> Delete Selected
              </Button>
            </div>
          )}
        </div>
        <div className="border rounded-sm bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[40px]">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead className="font-mono text-xs font-semibold w-24">Code</TableHead>
                <TableHead className="font-mono text-xs font-semibold">Type</TableHead>
                <TableHead className="font-mono text-xs font-semibold">Category</TableHead>
                <TableHead className="font-mono text-xs font-semibold">Name</TableHead>
                <TableHead className="font-mono text-xs font-semibold">Description</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : displayedAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-mono text-sm">No accounts found</TableCell>
                </TableRow>
              ) : (
                displayedAccounts.map((row) => (
                  <TableRow key={row.id} className="group" data-state={selectedIds.has(row.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleSelectRow(row.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{row.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono uppercase text-[10px] ${row.type === 'revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} border-transparent`}>
                        {row.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{row.category}</TableCell>
                    <TableCell className="text-sm">{row.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-6 h-6 w-6" onClick={() => handleEdit(row)}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-6 h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDelete(row.id)}>
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
        <AccountFormModal 
          open={isModalOpen} 
          onOpenChange={setIsModalOpen} 
          entryToEdit={entryToEdit} 
        />
      )}

      <Dialog open={!!importSummary} onOpenChange={(o) => !o && setImportSummary(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Summary</DialogTitle>
            <DialogDescription>Results of the Chart of Accounts import</DialogDescription>
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
                <div className="max-h-48 overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Row</TableHead>
                        <TableHead className="text-xs">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importSummary.errors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{err.row}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{err.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
