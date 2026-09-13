// Espelha os contratos da API (finance-tracker-backend).
// Valores monetários sempre em centavos; datas "YYYY-MM-DD"; meses "YYYY-MM".

export type TransactionType = 'income' | 'expense';
export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  categoryId: string | null;
  category: Category | null;
  note: string | null;
  recurringId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionInput {
  date: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  categoryId?: string | null;
  note?: string | null;
}

export interface RecurringTransaction {
  id: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  categoryId: string | null;
  category: Category | null;
  frequency: Frequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  note: string | null;
}

export type RecurringInput = Omit<RecurringTransaction, 'id' | 'category'>;

export interface DaySummary {
  date: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  transactionCount: number;
}

export interface MonthTotals {
  month: string;
  initialBalanceCents: number;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  finalBalanceCents: number;
  transactionCount: number;
  days: DaySummary[];
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string | null;
  incomeCents: number;
  expenseCents: number;
  transactionCount: number;
}

export interface MonthSummary extends MonthTotals {
  byCategory: CategoryTotal[];
}

export interface YearSummary {
  year: number;
  initialBalanceCents: number;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  finalBalanceCents: number;
  months: MonthTotals[];
}

export interface ActiveMonth {
  month: string;
  transactionCount: number;
}
