export type Transaction = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'entrada' | 'saída' | 'income';
  category?: string;
  note?: string;
};

export type RecurrenceFrequency = 'monthly' | 'weekly' | 'daily';

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saída';
  category: string;
  note?: string;
  frequency: RecurrenceFrequency;
  dayOfMonth?: number;    // Para frequência mensal: dia do mês (1-31)
  dayOfWeek?: number;     // Para frequência semanal: dia da semana (0-6, 0 = Domingo)
  isActive: boolean;
  startDate: Date;
  endDate?: Date;         // Opcional: data final da recorrência
}

export type DailyBalance = {
  date: Date;
  income: number;
  expense: number;
  balance: number;
  dailyTransactions: Transaction[];
};

export interface MonthlyData {
  month: number;
  year: number;
  initialBalance?: number; // Saldo inicial do mês (vindo do mês anterior)
  totalIncome: number;
  totalExpense: number;
  performance: number;
  dailyBalances: DailyBalance[];
}