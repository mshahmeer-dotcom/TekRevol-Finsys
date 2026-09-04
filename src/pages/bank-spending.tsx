import React, { useCallback, useEffect, useState } from 'react';
import {
  useCreatePlaidLinkToken,
  useCreateManualPlaidItem,
  useDeletePlaidItem,
  useExchangePlaidPublicToken,
  usePlaidAccounts,
  usePlaidItems,
  usePlaidStatus,
  usePlaidStatements,
  usePlaidUnpostedTransactions,
  useSyncPlaidItem,
  useUploadPlaidStatement,
} from '@workspace/api-client-react';
import { PageContent, PageHeader } from '@/components/layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormatCurrency } from '@/components/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlaidLink } from 'react-plaid-link';
import { Download, FileText, Landmark, Link2, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const MANUAL_BANK_COUNTRIES = [
  { value: 'AE', label: 'United Arab Emirates', currency: 'AED' },
  { value: 'SA', label: 'Saudi Arabia', currency: 'SAR' },
  { value: 'QA', label: 'Qatar', currency: 'QAR' },
  { value: 'KW', label: 'Kuwait', currency: 'KWD' },
  { value: 'BH', label: 'Bahrain', currency: 'BHD' },
  { value: 'OM', label: 'Oman', currency: 'OMR' },
  { value: 'PK', label: 'Pakistan', currency: 'PKR' },
];

const BANK_ICON_OPTIONS = ['🏦', '🏛️', '💳', '🏧', '◆'];

function BankMark({ item, compact = false, large = false }: { item: any; compact?: boolean; large?: boolean }) {
  const fallback = String(item.institutionName || 'B').trim().slice(0, 2).toUpperCase();
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-md border bg-muted font-semibold ${large ? 'size-12 text-xl' : compact ? 'size-7 text-xs' : 'size-9 text-sm'}`}>
      {item.icon || fallback}
    </div>
  );
}

export default function BankSpending() {
  const queryClient = useQueryClient();
  const { data: plaidStatus } = usePlaidStatus();
  const { data: plaidItems } = usePlaidItems();
  const { data: plaidAccounts } = usePlaidAccounts();
  const [selectedBankId, setSelectedBankId] = useState<number>();
  const banks = (plaidItems as any[]) || [];
  const selectedBank = banks.find((item) => item.id === selectedBankId);
  const { data: unpostedTransactions, isLoading: isLoadingUnposted } = usePlaidUnpostedTransactions(selectedBankId);
  const { data: statements, isLoading: isLoadingStatements } = usePlaidStatements(selectedBankId);
  const createLinkToken = useCreatePlaidLinkToken();
  const createManualBank = useCreateManualPlaidItem();
  const exchangeToken = useExchangePlaidPublicToken();
  const syncItem = useSyncPlaidItem();
  const deleteItem = useDeletePlaidItem();
  const uploadStatement = useUploadPlaidStatement();
  const [linkToken, setLinkToken] = useState<string>();
  const [manualBankOpen, setManualBankOpen] = useState(false);
  const [statementUploadOpen, setStatementUploadOpen] = useState(false);
  const [statementFile, setStatementFile] = useState<File>();
  const [manualBank, setManualBank] = useState({
    institutionName: '',
    country: 'PK',
    icon: '🏦',
  });

  const onPlaidSuccess = useCallback((publicToken: string, metadata: any) => {
    exchangeToken.mutate(
      {
        publicToken,
        institution: metadata?.institution
          ? {
              institution_id: metadata.institution.institution_id,
              name: metadata.institution.name,
            }
          : undefined,
      },
      {
        onSuccess: (result: any) => {
          setLinkToken(undefined);
          if (result?.itemId) setSelectedBankId(result.itemId);
          queryClient.invalidateQueries({ queryKey: ['plaid-items'] });
          queryClient.invalidateQueries({ queryKey: ['plaid-accounts'] });
        },
      },
    );
  }, [exchangeToken, queryClient]);

  const { open, ready } = usePlaidLink({
    token: linkToken || '',
    onSuccess: onPlaidSuccess,
    onExit: () => setLinkToken(undefined),
  });

  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  useEffect(() => {
    if (banks.length === 0) {
      if (selectedBankId !== undefined) setSelectedBankId(undefined);
    } else if (!banks.some((item) => item.id === selectedBankId)) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

  const connectBank = () => {
    createLinkToken.mutate(undefined, {
      onSuccess: (result: any) => setLinkToken(result.linkToken),
    });
  };

  const refreshPlaidData = () => {
    queryClient.invalidateQueries({ queryKey: ['plaid-items'] });
    queryClient.invalidateQueries({ queryKey: ['plaid-accounts'] });
    queryClient.invalidateQueries({ queryKey: ['plaid-unposted-transactions', selectedBankId] });
    queryClient.invalidateQueries({ queryKey: ['plaid-statements', selectedBankId] });
  };

  const addManualBank = () => {
    createManualBank.mutate(manualBank, {
      onSuccess: (result: any) => {
        setManualBankOpen(false);
        setManualBank({ institutionName: '', country: 'PK', icon: '🏦' });
        if (result?.itemId) setSelectedBankId(result.itemId);
        refreshPlaidData();
      },
    });
  };

  const disconnectBank = (item: any) => {
    deleteItem.mutate({ id: item.id }, {
      onSuccess: () => {
        if (selectedBankId === item.id) setSelectedBankId(undefined);
        refreshPlaidData();
      },
    });
  };

  const openStatementUpload = (itemId: number) => {
    setSelectedBankId(itemId);
    setStatementFile(undefined);
    setStatementUploadOpen(true);
  };

  const submitStatementUpload = () => {
    if (!selectedBankId || !statementFile) return;
    uploadStatement.mutate(
      { itemId: selectedBankId, file: statementFile },
      {
        onSuccess: () => {
          setStatementFile(undefined);
          setStatementUploadOpen(false);
          queryClient.invalidateQueries({ queryKey: ['plaid-statements', selectedBankId] });
        },
      },
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <PageHeader title="Bank Transaction" description="Bank connections, manual bank profiles, and posted or unposted transaction review">
        {banks.length > 0 && (
          <div className="flex flex-row items-start gap-2">
            {banks.map((item) => (
              <div key={item.id} className="flex flex-col items-center gap-0.5">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className={`relative size-9 rounded-md p-1 ${selectedBankId === item.id ? 'border-primary bg-primary/10' : ''}`}
                    aria-label={`Open ${item.institutionName}`}
                    title={`${item.institutionName}${item.hasBalance ? ` · ${item.balanceCurrency || 'USD'} ${item.currentBalance}` : ''}`}
                  >
                    <BankMark item={item} compact />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <BankMark item={item} compact />
                    <span className="truncate">{item.institutionName}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => setSelectedBankId(item.id)}>
                    View unposted transactions
                  </DropdownMenuItem>
                  {!item.isManual && (
                    <DropdownMenuItem
                      disabled={syncItem.isPending}
                      onSelect={() => syncItem.mutate({ id: item.id }, { onSuccess: refreshPlaidData })}
                    >
                      <RefreshCw className="size-4" />
                      Sync bank
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => openStatementUpload(item.id)}>
                    <Upload className="size-4" />
                    Upload bank statement
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => disconnectBank(item)}>
                    <Trash2 className="size-4" />
                    Disconnect bank
                  </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
                <span className={`text-[10px] font-medium leading-3 ${item.unpostedCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {item.unpostedCount > 99 ? '99+' : item.unpostedCount || 0}
                </span>
              </div>
            ))}
            <Button type="button" size="icon" variant="outline" title="Add bank without API" aria-label="Add bank without API" onClick={() => setManualBankOpen(true)}>
              <Plus className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              title="Connect another bank"
              aria-label="Connect another bank"
              onClick={connectBank}
              disabled={!plaidStatus?.configured || createLinkToken.isPending || exchangeToken.isPending}
            >
              <Link2 className="size-4" />
            </Button>
          </div>
        )}
      </PageHeader>
      <PageContent>
        {banks.length === 0 && <Card className="rounded-sm mb-6 border-primary/30">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Landmark className="size-4" />
                Connected Banks
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Securely connect a supported institution through Plaid and sync transactions for review.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setManualBankOpen(true)}
              >
                <Plus className="size-4 mr-2" />
                Add Bank Without API
              </Button>
              <Button
                size="sm"
                onClick={connectBank}
                disabled={!plaidStatus?.configured || createLinkToken.isPending || exchangeToken.isPending}
              >
                <Link2 className="size-4 mr-2" />
                {createLinkToken.isPending ? 'Preparing…' : (plaidItems as any[])?.length ? 'Connect Another Bank' : 'Connect Bank'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!plaidStatus?.configured && (
              <div className="rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Plaid credentials are not configured. Add PLAID_CLIENT_ID and PLAID_SECRET in Replit Secrets.
              </div>
            )}
            <div className="rounded-sm border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Connect multiple institutions one at a time—each linked bank stays listed separately. For GCC and Pakistan banks that are not available in Plaid, use “Add Bank Without API” to save a bank profile without inventing live balances or transactions.
            </div>
            {(plaidItems || []).length === 0 ? (
              <div className="text-sm text-muted-foreground py-3">No banks connected yet.</div>
            ) : (
              <div className="space-y-2">
                {(plaidItems as any[]).map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedBankId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setSelectedBankId(item.id);
                    }}
                    className={`flex cursor-pointer flex-wrap items-center justify-between gap-3 rounded-sm border px-3 py-2 transition-colors hover:bg-muted/30 ${selectedBankId === item.id ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <BankMark item={item} />
                      <div>
                        <div className="font-medium text-sm">{item.institutionName}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.accountCount} account{item.accountCount === 1 ? '' : 's'}
                          {item.country ? ` · ${MANUAL_BANK_COUNTRIES.find((country) => country.value === item.country)?.label || item.country}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="mr-3 text-right">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Current balance</div>
                        <div className="font-mono text-sm font-semibold">
                          {item.hasBalance
                            ? <FormatCurrency amount={item.currentBalance} currency={item.balanceCurrency || 'USD'} decimals={2} />
                            : <span className="text-xs font-normal text-muted-foreground">Unavailable</span>}
                        </div>
                      </div>
                      <Badge variant="secondary">{item.isManual ? 'Manual Bank' : 'Plaid Linked'}</Badge>
                      {!item.isManual && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            syncItem.mutate({ id: item.id }, { onSuccess: refreshPlaidData });
                          }}
                          disabled={syncItem.isPending}
                        >
                          <RefreshCw className={`size-4 mr-2 ${syncItem.isPending ? 'animate-spin' : ''}`} />
                          Sync
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Disconnect ${item.institutionName}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteItem.mutate({ id: item.id }, {
                            onSuccess: () => {
                              if (selectedBankId === item.id) setSelectedBankId(undefined);
                              refreshPlaidData();
                            },
                          });
                        }}
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(plaidAccounts as any[])?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {(plaidAccounts as any[]).map((account) => (
                  <div key={account.plaidAccountId} className="rounded-sm bg-muted/30 px-3 py-2 text-xs">
                    <div className="font-medium">{account.name} {account.mask ? `••${account.mask}` : ''}</div>
                    <div className="text-muted-foreground">{account.institutionName} · {account.subtype || account.type}</div>
                    <div className="mt-1 font-mono font-medium">
                      {account.currentBalance !== null && account.currentBalance !== undefined
                        ? <FormatCurrency amount={account.currentBalance} currency={account.isoCurrency || 'USD'} decimals={2} />
                        : <span className="text-muted-foreground">Balance unavailable</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          </Card>}

        <div className={banks.length > 0 ? 'space-y-6' : ''}>
          {banks.length > 0 && (
            <Card className="rounded-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Connected Banks</CardTitle>
                <p className="text-xs text-muted-foreground">Select a bank to review its transactions.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {banks.map((item) => (
                  <div key={item.id} className={`flex w-full items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/30 ${selectedBankId === item.id ? 'border-primary bg-primary/5' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedBankId(item.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <BankMark item={item} large />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.institutionName}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.isManual ? 'Manual Bank' : 'Plaid Linked'} · {item.unpostedCount || 0} unposted
                        </span>
                        <span className="mt-2 block font-mono text-sm font-semibold">
                          {item.hasBalance
                            ? <FormatCurrency amount={item.currentBalance} currency={item.balanceCurrency || 'USD'} decimals={2} />
                            : <span className="text-xs font-normal text-muted-foreground">Balance unavailable</span>}
                        </span>
                      </span>
                    </button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      title={`Upload a statement for ${item.institutionName}`}
                      aria-label={`Upload a statement for ${item.institutionName}`}
                      onClick={() => openStatementUpload(item.id)}
                    >
                      <Upload className="size-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        <Card className="rounded-sm mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {selectedBank ? `Unposted Transactions · ${selectedBank.institutionName}` : 'Unposted Transactions'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {selectedBank
                ? 'Pending transactions from the selected bank. Posted transactions are not shown here.'
                : 'Select a bank from the left panel or its icon above to view its pending transactions.'}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedBank ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">Select a bank to view its unposted transactions.</div>
            ) : isLoadingUnposted ? (
              <div className="p-4"><Skeleton className="h-16 w-full" /></div>
            ) : !(unpostedTransactions as any[])?.length ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No unposted transactions for {selectedBank.institutionName}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-sidebar">
                      <TableHead className="font-mono text-xs text-sidebar-foreground">Date</TableHead>
                      <TableHead className="font-mono text-xs text-sidebar-foreground">Merchant</TableHead>
                      <TableHead className="font-mono text-xs text-sidebar-foreground">Account</TableHead>
                      <TableHead className="font-mono text-xs text-right text-sidebar-foreground">Amount</TableHead>
                      <TableHead className="font-mono text-xs text-sidebar-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(unpostedTransactions as any[]).map((transaction) => (
                      <TableRow key={transaction.plaidTransactionId}>
                        <TableCell className="text-xs">{transaction.date}</TableCell>
                        <TableCell className="text-sm font-medium">{transaction.merchantName || transaction.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{transaction.accountName || transaction.institutionName}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          <FormatCurrency amount={transaction.amount} currency={transaction.isoCurrency || 'USD'} decimals={2} />
                        </TableCell>
                        <TableCell><Badge variant="outline">Unposted</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        {selectedBank && (
          <Card className="rounded-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="size-4" />
                  Uploaded Statements
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Statements stored for {selectedBank.institutionName}.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => openStatementUpload(selectedBank.id)}>
                <Upload className="size-4 mr-2" />
                Upload Statement
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingStatements ? (
                <Skeleton className="h-10 w-full" />
              ) : !(statements as any[])?.length ? (
                <p className="text-sm text-muted-foreground">No statements uploaded for this bank yet.</p>
              ) : (
                <div className="space-y-2">
                  {(statements as any[]).map((statement) => (
                    <div key={statement.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{statement.originalName}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(statement.fileSize)} · {new Date(statement.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <a
                        href={`/api/plaid/statements/${statement.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:bg-muted"
                        aria-label={`Download ${statement.originalName}`}
                        title="Download statement"
                      >
                        <Download className="size-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>

        <Dialog
          open={statementUploadOpen}
          onOpenChange={(open) => {
            setStatementUploadOpen(open);
            if (!open) setStatementFile(undefined);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Bank Statement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload a statement for {selectedBank?.institutionName || 'the selected bank'}. The file will be stored with this bank for review.
              </p>
              <div className="space-y-2">
                <Label htmlFor="bank-statement-file">Statement file</Label>
                <Input
                  id="bank-statement-file"
                  type="file"
                  accept=".csv,.xls,.xlsx,.pdf"
                  onChange={(event) => setStatementFile(event.target.files?.[0])}
                />
                <p className="text-xs text-muted-foreground">Supported: CSV, XLS, XLSX, or PDF · maximum 15 MB</p>
              </div>
              {statementFile && (
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  Selected: <span className="font-medium">{statementFile.name}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStatementUploadOpen(false)}>Cancel</Button>
              <Button type="button" onClick={submitStatementUpload} disabled={!statementFile || !selectedBankId || uploadStatement.isPending}>
                {uploadStatement.isPending ? 'Uploading…' : 'Upload Statement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={manualBankOpen} onOpenChange={setManualBankOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Bank Without API</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add an unsupported GCC or Pakistan institution for display. Because it has no API connection, live balances and transactions will remain unavailable until data is connected.
              </p>
              <div className="space-y-2">
                <Label htmlFor="manual-bank-name">Bank name</Label>
                <Input
                  id="manual-bank-name"
                  value={manualBank.institutionName}
                  onChange={(event) => setManualBank((current) => ({ ...current, institutionName: event.target.value }))}
                  placeholder="e.g. Meezan Bank, Emirates NBD"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country / currency</Label>
                  <Select value={manualBank.country} onValueChange={(country) => setManualBank((current) => ({ ...current, country }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MANUAL_BANK_COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>{country.label} · {country.currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bank icon</Label>
                  <Select value={manualBank.icon} onValueChange={(icon) => setManualBank((current) => ({ ...current, icon }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BANK_ICON_OPTIONS.map((icon) => <SelectItem key={icon} value={icon}>{icon} Bank mark</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setManualBankOpen(false)}>Cancel</Button>
              <Button type="button" onClick={addManualBank} disabled={!manualBank.institutionName.trim() || createManualBank.isPending}>
                {createManualBank.isPending ? 'Adding…' : 'Add Bank'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </PageContent>
    </>
  );
}
