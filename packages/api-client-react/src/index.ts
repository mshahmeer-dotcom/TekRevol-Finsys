import { useQuery, useMutation } from '@tanstack/react-query';

const BASE = '/api';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`API ${path}: ${res.status} ${text}`);
  }
  return res.json();
}

function qs(params: Record<string, any>) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

type QueryOpts = { query?: { queryKey?: any[]; enabled?: boolean } };

// ===== ACCOUNTS =====
export const getListAccountsQueryKey = (params?: any) => ['accounts', params];

export function useListAccounts(params?: { type?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? getListAccountsQueryKey(params),
    queryFn: () => apiFetch(`/accounts${qs(params ?? {})}`),
  });
}

export function useCreateAccount() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiFetch('/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useUpdateAccount() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/accounts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) => apiFetch(`/accounts/${id}`, { method: 'DELETE' }),
  });
}

export function useBulkImportAccounts() {
  return useMutation({
    mutationFn: ({ rows }: { rows: any[] }) =>
      apiFetch('/accounts/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) }),
  });
}

export function useBulkDeleteAccounts() {
  return useMutation({
    mutationFn: ({ ids }: { ids: number[] }) =>
      apiFetch('/accounts/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }),
  });
}

// ===== DEPARTMENTS =====
export const getListDepartmentsQueryKey = () => ['departments'];

export function useListDepartments(opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? getListDepartmentsQueryKey(),
    queryFn: () => apiFetch('/departments'),
  });
}

export function useCreateDepartment() {
  return useMutation({
    mutationFn: ({ name }: { name: string }) =>
      apiFetch('/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }),
  });
}

// ===== REVENUE =====
export const getListRevenueQueryKey = (params?: any) => ['revenue', params];

export function useListRevenue(params?: { month?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? getListRevenueQueryKey(params),
    queryFn: () => apiFetch(`/revenue${qs(params ?? {})}`),
  });
}

export function useCreateRevenue() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiFetch('/revenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useUpdateRevenue() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/revenue/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useDeleteRevenue() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) => apiFetch(`/revenue/${id}`, { method: 'DELETE' }),
  });
}

export function useBulkImportRevenue() {
  return useMutation({
    mutationFn: ({ rows }: { rows: any[] }) =>
      apiFetch('/revenue/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) }),
  });
}

export function useBulkDeleteRevenue() {
  return useMutation({
    mutationFn: ({ ids }: { ids: number[] }) =>
      apiFetch('/revenue/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }),
  });
}

// ===== EXPENSES =====
export const getListExpensesQueryKey = (params?: any) => ['expenses', params];

export function useListExpenses(params?: { month?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? getListExpensesQueryKey(params),
    queryFn: () => apiFetch(`/expenses${qs(params ?? {})}`),
  });
}

export function useCreateExpense() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiFetch('/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useUpdateExpense() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/expenses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useDeleteExpense() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) => apiFetch(`/expenses/${id}`, { method: 'DELETE' }),
  });
}

export function useBulkImportExpenses() {
  return useMutation({
    mutationFn: ({ rows }: { rows: any[] }) =>
      apiFetch('/expenses/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) }),
  });
}

export function useBulkDeleteExpenses() {
  return useMutation({
    mutationFn: ({ ids }: { ids: number[] }) =>
      apiFetch('/expenses/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }),
  });
}

// ===== EXCHANGE RATES =====
export const getListExchangeRatesQueryKey = (params?: any) => ['exchange-rates', params];

export function useListExchangeRates(params?: { month?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? getListExchangeRatesQueryKey(params),
    queryFn: () => apiFetch(`/exchange-rates${qs(params ?? {})}`),
  });
}

export function useUpsertExchangeRate() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiFetch('/exchange-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useDeleteExchangeRate() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) => apiFetch(`/exchange-rates/${id}`, { method: 'DELETE' }),
  });
}

// ===== ALLOCATION RULES =====
export const getListAllocationRulesQueryKey = () => ['allocation-rules'];

export function useListAllocationRules(opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? getListAllocationRulesQueryKey(),
    queryFn: () => apiFetch('/allocation-rules'),
  });
}

export function useCreateAllocationRule() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiFetch('/allocation-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useUpdateAllocationRule() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/allocation-rules/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useDeleteAllocationRule() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) => apiFetch(`/allocation-rules/${id}`, { method: 'DELETE' }),
  });
}

// ===== INTERCOMPANY TRANSACTIONS =====
export const getListIntercompanyTransactionsQueryKey = (params?: any) => ['intercompany-transactions', params];

export function useListIntercompanyTransactions(params?: { month?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? getListIntercompanyTransactionsQueryKey(params),
    queryFn: () => apiFetch(`/intercompany-transactions${qs(params ?? {})}`),
  });
}

export function useCreateIntercompanyTransaction() {
  return useMutation({
    mutationFn: ({ data }: { data: any }) =>
      apiFetch('/intercompany-transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useUpdateIntercompanyTransaction() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/intercompany-transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  });
}

export function useDeleteIntercompanyTransaction() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) => apiFetch(`/intercompany-transactions/${id}`, { method: 'DELETE' }),
  });
}

// ===== DASHBOARD =====
export function useGetDashboard(params?: { month?: string; brand?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['dashboard', params],
    queryFn: () => apiFetch(`/dashboard${qs(params ?? {})}`),
  });
}

export function useGetMonthlyTrend(opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['monthly-trend'],
    queryFn: () => apiFetch('/monthly-trend'),
  });
}

// ===== REPORTS =====
export function useGetBrandPL(params?: { entity?: string; month?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['brand-pl', params],
    queryFn: () => apiFetch(`/brand-pl${qs(params ?? {})}`),
    enabled: !!params?.entity,
  });
}

export function useGetConsolidatedPL(params?: { month?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['consolidated-pl', params],
    queryFn: () => apiFetch(`/consolidated-pl${qs(params ?? {})}`),
  });
}

export function useGetMonthlyPL(params?: { year?: string; brand?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['monthly-pl', params],
    queryFn: () => apiFetch(`/monthly-pl${qs(params ?? {})}`),
  });
}

export function useGetAllocationReport(params?: { month?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['allocation', params],
    queryFn: () => apiFetch(`/allocation${qs(params ?? {})}`),
  });
}

export function useGetBankSpending(params?: { month?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['bank-spending', params],
    queryFn: () => apiFetch(`/bank-spending${qs(params ?? {})}`),
  });
}

export function useGetIntercompany(params?: { month?: string }, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['intercompany', params],
    queryFn: () => apiFetch(`/intercompany${qs(params ?? {})}`),
  });
}

// ===== PLAID BANK CONNECTIONS =====
export function usePlaidStatus(opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['plaid-status'],
    queryFn: () => apiFetch('/plaid/status'),
  });
}

export function usePlaidItems(opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['plaid-items'],
    queryFn: () => apiFetch('/plaid/items'),
  });
}

export function usePlaidAccounts(opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['plaid-accounts'],
    queryFn: () => apiFetch('/plaid/accounts'),
  });
}

export function usePlaidTransactions(limit = 50, opts?: QueryOpts) {
  return useQuery({
    queryKey: opts?.query?.queryKey ?? ['plaid-transactions', limit],
    queryFn: () => apiFetch(`/plaid/transactions?limit=${limit}`),
  });
}

export function usePlaidUnpostedTransactions(itemId?: number) {
  return useQuery({
    queryKey: ['plaid-unposted-transactions', itemId],
    queryFn: () => apiFetch(`/plaid/items/${itemId}/unposted`),
    enabled: Boolean(itemId),
  });
}

export function usePlaidStatements(itemId?: number) {
  return useQuery({
    queryKey: ['plaid-statements', itemId],
    queryFn: () => apiFetch(`/plaid/items/${itemId}/statements`),
    enabled: Boolean(itemId),
  });
}

export function useUploadPlaidStatement() {
  return useMutation({
    mutationFn: ({ itemId, file }: { itemId: number; file: File }) => {
      const formData = new FormData();
      formData.append('statement', file);
      return apiFetch(`/plaid/items/${itemId}/statements`, {
        method: 'POST',
        body: formData,
      });
    },
  });
}

export function useCreatePlaidLinkToken() {
  return useMutation({
    mutationFn: () => apiFetch('/plaid/link-token', { method: 'POST' }),
  });
}

export function useExchangePlaidPublicToken() {
  return useMutation({
    mutationFn: ({ publicToken, institution }: { publicToken: string; institution?: any }) =>
      apiFetch('/plaid/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicToken, institution }),
      }),
  });
}

export function useCreateManualPlaidItem() {
  return useMutation({
    mutationFn: ({
      institutionName,
      country,
      icon,
    }: {
      institutionName: string;
      country: string;
      icon: string;
    }) =>
      apiFetch('/plaid/manual-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionName, country, icon }),
      }),
  });
}

export function useSyncPlaidItem() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiFetch(`/plaid/items/${id}/sync`, { method: 'POST' }),
  });
}

export function useDeletePlaidItem() {
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      apiFetch(`/plaid/items/${id}`, { method: 'DELETE' }),
  });
}
