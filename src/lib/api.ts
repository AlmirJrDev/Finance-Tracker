import type {
  ActiveMonth,
  Category,
  MonthSummary,
  RecurringInput,
  RecurringTransaction,
  Transaction,
  TransactionInput,
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
  categoryId?: string;
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
    month: (month: string) => request<MonthSummary>(`/api/summary/month/${month}`),
    year: (year: number) => request<YearSummary>(`/api/summary/year/${year}`),
    months: () => request<ActiveMonth[]>('/api/summary/months'),
  },
};
