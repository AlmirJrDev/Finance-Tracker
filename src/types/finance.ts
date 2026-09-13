// Espelha os contratos da API (finance-tracker-backend).
// Valores monetários sempre em centavos; datas "YYYY-MM-DD"; meses "YYYY-MM".

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending';
export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  description: string | null;
  isDefault: boolean;
}

export interface Installment {
  groupId: string;
  number: number;
  total: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  status: TransactionStatus;
  categoryId: string | null;
  category: Category | null;
  note: string | null;
  recurringId: string | null;
  installment: Installment | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionInput {
  date: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  status?: TransactionStatus;
  categoryId?: string | null;
  note?: string | null;
}

export interface InstallmentInput {
  date: string;
  description: string;
  totalAmountCents: number;
  installments: number;
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
  autoConfirm: boolean;
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
  pendingCount: number;
}

export interface MonthTotals {
  month: string;
  initialBalanceCents: number;
  incomeCents: number;
  expenseCents: number;
  resultCents: number;
  finalBalanceCents: number;
  paidIncomeCents: number;
  paidExpenseCents: number;
  pendingIncomeCents: number;
  pendingExpenseCents: number;
  paidFinalBalanceCents: number;
  transactionCount: number;
  pendingCount: number;
  days: DaySummary[];
}

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string | null;
  incomeCents: number;
  expenseCents: number;
  pendingExpenseCents: number;
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

export interface UpcomingItem {
  id: string | null;
  date: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  status: TransactionStatus;
  categoryId: string | null;
  category: Category | null;
  recurringId: string | null;
  installment?: Installment | null;
  /** true = ocorrência de recorrência que ainda não foi gerada */
  virtual: boolean;
}

export interface Projection {
  today: string;
  days: number;
  realizedBalanceCents: number;
  projectedTodayCents: number;
  endBalanceCents: number;
  lowest: { date: string; balanceCents: number };
  firstNegativeDate: string | null;
  overdue: { count: number; incomeCents: number; expenseCents: number };
  upcoming: UpcomingItem[];
  points: { date: string; balanceCents: number }[];
}

export type BudgetLevel = 'ok' | 'warning' | 'exceeded';

export interface BudgetStatus {
  categoryId: string;
  category: Category;
  month: string;
  amountCents: number;
  alertPercent: number;
  paidCents: number;
  pendingCents: number;
  totalCents: number;
  remainingCents: number;
  percent: number;
  level: BudgetLevel;
}
