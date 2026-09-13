import type {
  Account,
  AccountType,
  TransferInput,
  ActiveMonth,
  BudgetStatus,
  Category,
  InstallmentInput,
  MonthSummary,
  Projection,
  RecurringInput,
  RecurringTransaction,
  Transaction,
  TransactionInput,
  TransactionStatus,
  TransactionType,
  YearSummary,
} from '@/types/finance';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: { path: string; message: string }[]
  ) {
    super(message);
  }

  get isAuthError() {
    return this.status === 401;
  }
}

// O token vem da sessão do NextAuth (ver components/providers.tsx). Fica só em memória.
let token: string | null = null;

export function setApiToken(value: string | null) {
  token = value;
}

type Query = Record<string, string | number | boolean | undefined | null>;

async function request<T>(path: string, init: { method?: string; body?: unknown; query?: Query } = {}): Promise<T> {
  const url = new URL(path, API_URL);
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      response.status,
      payload?.error ?? 'UNKNOWN_ERROR',
      payload?.message ?? `Erro ${response.status} na requisição.`,
      payload?.details
    );
  }
  return payload.data as T;
}

export type TransactionFilters = {
  month?: string;
  from?: string;
  to?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  categoryId?: string;
  accountId?: string;
  q?: string;
  sort?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

export const api = {
  transactions: {
    list: (filters: TransactionFilters = {}) => request<Transaction[]>('/api/transactions', { query: filters }),
    create: (input: TransactionInput) => request<Transaction>('/api/transactions', { method: 'POST', body: input }),
    update: (id: string, input: Partial<TransactionInput>) =>
      request<Transaction>(`/api/transactions/${id}`, { method: 'PUT', body: input }),
    remove: (id: string) => request<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
    setStatus: (ids: string[], status: TransactionStatus) =>
      request<{ modifiedCount: number }>('/api/transactions/status', { method: 'POST', body: { ids, status } }),
    createInstallments: (input: InstallmentInput) =>
      request<Transaction[]>('/api/transactions/installments', { method: 'POST', body: input }),
    removeInstallments: (groupId: string, onlyPending: boolean) =>
      request<{ deletedCount: number }>(`/api/transactions/installments/${groupId}`, {
        method: 'DELETE',
        query: { onlyPending },
      }),
  },

  accounts: {
    list: () => request<Account[]>('/api/accounts'),
    create: (input: { name: string; type: AccountType; color?: string }) =>
      request<Account>('/api/accounts', { method: 'POST', body: input }),
    update: (id: string, input: Partial<{ name: string; type: AccountType; color: string; isArchived: boolean; isDefault: true }>) =>
      request<Account>(`/api/accounts/${id}`, { method: 'PUT', body: input }),
    remove: (id: string, moveTo?: string) =>
      request<{ movedCount: number }>(`/api/accounts/${id}`, { method: 'DELETE', query: { moveTo } }),
    adjust: (id: string, input: { balanceCents: number; date?: string }) =>
      request<Transaction | null>(`/api/accounts/${id}/adjust`, { method: 'POST', body: input }),
    transfer: (input: TransferInput) =>
      request<{ transferId: string; from: Transaction; to: Transaction }>('/api/accounts/transfers', { method: 'POST', body: input }),
  },

  budgets: {
    list: (month: string) => request<BudgetStatus[]>('/api/budgets', { query: { month } }),
    save: (categoryId: string, input: { amountCents: number; alertPercent?: number }) =>
      request<{ categoryId: string; amountCents: number; alertPercent: number }>(`/api/budgets/${categoryId}`, {
        method: 'PUT',
        body: input,
      }),
    remove: (categoryId: string) => request<void>(`/api/budgets/${categoryId}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => request<Category[]>('/api/categories'),
    create: (input: { name: string; color?: string; icon?: string | null }) =>
      request<Category>('/api/categories', { method: 'POST', body: input }),
    update: (id: string, input: { name?: string; color?: string; icon?: string | null }) =>
      request<Category>(`/api/categories/${id}`, { method: 'PUT', body: input }),
    remove: (id: string) =>
      request<{ movedTo: string | null; movedCount: number }>(`/api/categories/${id}`, { method: 'DELETE' }),
  },

  recurring: {
    list: () => request<RecurringTransaction[]>('/api/recurring-transactions'),
    create: (input: RecurringInput) =>
      request<RecurringTransaction>('/api/recurring-transactions', { method: 'POST', body: input }),
    update: (id: string, input: Partial<RecurringInput>) =>
      request<RecurringTransaction>(`/api/recurring-transactions/${id}`, { method: 'PUT', body: input }),
    remove: (id: string) => request<void>(`/api/recurring-transactions/${id}`, { method: 'DELETE' }),
    apply: (input: { from: string; to: string; ids?: string[] }) =>
      request<{ created: number; existing: number }>('/api/recurring-transactions/apply', {
        method: 'POST',
        body: input,
      }),
  },

  summary: {
    month: (month: string, accountId?: string) =>
      request<MonthSummary>(`/api/summary/month/${month}`, { query: { accountId } }),
    year: (year: number, accountId?: string) => request<YearSummary>(`/api/summary/year/${year}`, { query: { accountId } }),
    months: (accountId?: string) => request<ActiveMonth[]>('/api/summary/months', { query: { accountId } }),
    projection: (days: number, accountId?: string) =>
      request<Projection>('/api/summary/projection', { query: { days, accountId } }),
  },
};
