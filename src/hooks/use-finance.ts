'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { addDays } from '@/lib/dates';
import type { AccountType, InstallmentInput, RecurringInput, TransactionInput, TransactionStatus, TransferInput } from '@/types/finance';

// Tudo que depende de saldo fica sob ['summary'] para ser invalidado junto
// accountId undefined = todas as contas
export const queryKeys = {
  categories: ['categories'] as const,
  recurring: ['recurring'] as const,
  accounts: ['summary', 'accounts'] as const,
  transactions: (month: string, accountId?: string) => ['transactions', month, accountId ?? 'all'] as const,
  overdue: (today: string, accountId?: string) => ['transactions', 'overdue', today, accountId ?? 'all'] as const,
  monthSummary: (month: string, accountId?: string) => ['summary', 'month', month, accountId ?? 'all'] as const,
  yearSummary: (year: number, accountId?: string) => ['summary', 'year', year, accountId ?? 'all'] as const,
  activeMonths: (accountId?: string) => ['summary', 'months', accountId ?? 'all'] as const,
  projection: (days: number, accountId?: string) => ['summary', 'projection', days, accountId ?? 'all'] as const,
  budgets: (month: string) => ['summary', 'budgets', month] as const,
  freshness: ['summary', 'freshness'] as const,
};

// ─── Leitura ──────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: api.categories.list, staleTime: 5 * 60_000 });
}

export function useFreshness() {
  return useQuery({ queryKey: queryKeys.freshness, queryFn: api.summary.freshness, staleTime: 5 * 60_000 });
}

export function useAccounts() {
  return useQuery({ queryKey: queryKeys.accounts, queryFn: api.accounts.list });
}

export function useMonthSummary(month: string, accountId?: string) {
  return useQuery({
    queryKey: queryKeys.monthSummary(month, accountId),
    queryFn: () => api.summary.month(month, accountId),
    placeholderData: keepPreviousData,
  });
}

export function useMonthTransactions(month: string, accountId?: string) {
  return useQuery({
    queryKey: queryKeys.transactions(month, accountId),
    queryFn: () => api.transactions.list({ month, accountId, sort: 'asc', limit: 500 }),
    placeholderData: keepPreviousData,
  });
}

export function useYearSummary(year: number, accountId?: string) {
  return useQuery({
    queryKey: queryKeys.yearSummary(year, accountId),
    queryFn: () => api.summary.year(year, accountId),
    placeholderData: keepPreviousData,
  });
}

export function useActiveMonths(accountId?: string) {
  return useQuery({ queryKey: queryKeys.activeMonths(accountId), queryFn: () => api.summary.months(accountId) });
}

export function useRecurring() {
  return useQuery({ queryKey: queryKeys.recurring, queryFn: api.recurring.list });
}

export function useProjection(days = 90, accountId?: string) {
  return useQuery({
    queryKey: queryKeys.projection(days, accountId),
    queryFn: () => api.summary.projection(days, accountId),
    placeholderData: keepPreviousData,
  });
}

export function useBudgets(month: string) {
  return useQuery({
    queryKey: queryKeys.budgets(month),
    queryFn: () => api.budgets.list(month),
    placeholderData: keepPreviousData,
  });
}

/** Pendentes com data anterior a hoje. */
export function useOverdueTransactions(today: string, enabled: boolean, accountId?: string) {
  return useQuery({
    queryKey: queryKeys.overdue(today, accountId),
    queryFn: () => api.transactions.list({ status: 'pending', to: addDays(today, -1), accountId, sort: 'asc', limit: 500 }),
    enabled,
  });
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

/** Qualquer mudança em transações afeta listas e todos os saldos seguintes. */
function useInvalidateMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['summary'] }),
    ]);
}

export function useSaveTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: TransactionInput }) =>
      id ? api.transactions.update(id, input) : api.transactions.create(input),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoney();
  return useMutation({ mutationFn: api.transactions.remove, onSuccess: invalidate });
}

export function useSetTransactionStatus() {
  const invalidate = useInvalidateMoney();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TransactionStatus }) => api.transactions.setStatus(ids, status),
    onSuccess: invalidate,
  });
}

export function useInstallmentMutations() {
  const invalidate = useInvalidateMoney();
  return {
    create: useMutation({
      mutationFn: (input: InstallmentInput) => api.transactions.createInstallments(input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: ({ groupId, onlyPending }: { groupId: string; onlyPending: boolean }) =>
        api.transactions.removeInstallments(groupId, onlyPending),
      onSuccess: invalidate,
    }),
  };
}

export function useBudgetMutations() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['summary', 'budgets'] });
  return {
    save: useMutation({
      mutationFn: ({ categoryId, amountCents, alertPercent }: { categoryId: string; amountCents: number; alertPercent?: number }) =>
        api.budgets.save(categoryId, { amountCents, alertPercent }),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: api.budgets.remove, onSuccess: refresh }),
  };
}

export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = useInvalidateMoney();
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.categories });
    await qc.invalidateQueries({ queryKey: queryKeys.recurring });
    await invalidate();
  };

  return {
    create: useMutation({ mutationFn: api.categories.create, onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ id, ...input }: { id: string; name?: string; color?: string; icon?: string | null }) =>
        api.categories.update(id, input),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: api.categories.remove, onSuccess: refresh }),
  };
}

export function useRecurringMutations() {
  const qc = useQueryClient();
  const invalidate = useInvalidateMoney();
  // Regras de recorrência entram na projeção mesmo antes de serem aplicadas
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.recurring }),
      qc.invalidateQueries({ queryKey: ['summary', 'projection'] }),
    ]);

  return {
    save: useMutation({
      mutationFn: ({ id, input }: { id?: string; input: RecurringInput }) =>
        id ? api.recurring.update(id, input) : api.recurring.create(input),
      onSuccess: refresh,
    }),
    toggle: useMutation({
      mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.recurring.update(id, { isActive }),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: api.recurring.remove, onSuccess: refresh }),
    apply: useMutation({ mutationFn: api.recurring.apply, onSuccess: invalidate }),
  };
}

export function useAccountMutations() {
  const qc = useQueryClient();
  const invalidate = useInvalidateMoney();
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['recurring'] });
    await invalidate();
  };
  return {
    create: useMutation({
      mutationFn: (input: { name: string; type: AccountType; color?: string }) => api.accounts.create(input),
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({ id, ...input }: { id: string } & Partial<{ name: string; type: AccountType; color: string; isArchived: boolean; isDefault: true }>) =>
        api.accounts.update(id, input),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: ({ id, moveTo }: { id: string; moveTo?: string }) => api.accounts.remove(id, moveTo),
      onSuccess: refresh,
    }),
    adjust: useMutation({
      mutationFn: ({ id, balanceCents, date }: { id: string; balanceCents: number; date?: string }) =>
        api.accounts.adjust(id, { balanceCents, date }),
      onSuccess: refresh,
    }),
    transfer: useMutation({ mutationFn: (input: TransferInput) => api.accounts.transfer(input), onSuccess: refresh }),
  };
}
