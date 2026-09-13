'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { RecurringInput, TransactionInput } from '@/types/finance';

export const queryKeys = {
  categories: ['categories'] as const,
  recurring: ['recurring'] as const,
  transactions: (month: string) => ['transactions', month] as const,
  monthSummary: (month: string) => ['summary', 'month', month] as const,
  yearSummary: (year: number) => ['summary', 'year', year] as const,
  activeMonths: ['summary', 'months'] as const,
};

// ─── Leitura ──────────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: api.categories.list, staleTime: 5 * 60_000 });
}

export function useMonthSummary(month: string) {
  return useQuery({
    queryKey: queryKeys.monthSummary(month),
    queryFn: () => api.summary.month(month),
    placeholderData: keepPreviousData,
  });
}

export function useMonthTransactions(month: string) {
  return useQuery({
    queryKey: queryKeys.transactions(month),
    queryFn: () => api.transactions.list({ month, sort: 'asc', limit: 500 }),
    placeholderData: keepPreviousData,
  });
}

export function useYearSummary(year: number) {
  return useQuery({
    queryKey: queryKeys.yearSummary(year),
    queryFn: () => api.summary.year(year),
    placeholderData: keepPreviousData,
  });
}

export function useActiveMonths() {
  return useQuery({ queryKey: queryKeys.activeMonths, queryFn: api.summary.months });
}

export function useRecurring() {
  return useQuery({ queryKey: queryKeys.recurring, queryFn: api.recurring.list });
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
  const refresh = () => qc.invalidateQueries({ queryKey: queryKeys.recurring });

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
