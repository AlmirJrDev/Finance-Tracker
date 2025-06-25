// lib/storage.ts
import { RecurringTransaction } from '@/components/ui/transactions-recurring';
import { MonthlyData, Transaction, DailyBalance } from '@/types/finance';
import {
  saveTransaction as saveTransactionToFirestore,
  getTransactions,
  getAllTransactions,
  getAllMonthlyData,
  deleteTransaction as deleteTransactionFromFirestore,
  saveRecurringTransaction,
  getRecurringTransactions,
  deleteRecurringTransaction,
  subscribeToTransactions,
  clearAllUserData
} from './firestore';

// === CARREGAMENTO DE DADOS ===

export async function loadData(): Promise<MonthlyData[]> {
  try {
    const monthlyData = await getAllMonthlyData();
    return ensureMonthContinuity(monthlyData);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return [];
  }
}

export async function loadMonthData(month: number, year: number): Promise<MonthlyData | null> {
  try {
    const transactions = await getTransactions(month, year);
    if (transactions.length === 0) return null;
    
    return calculateMonthlyDataFromTransactions(transactions, month, year);
  } catch (error) {
    console.error('Erro ao carregar dados do mês:', error);
    return null;
  }
}

// === SALVAMENTO DE DADOS ===

export function saveData(data: MonthlyData[]): void {
  // Com Firestore, o salvamento é feito automaticamente quando transações são adicionadas
  // Esta função é mantida para compatibilidade
  console.log('Dados salvos automaticamente no Firestore');
}

// === CONTINUIDADE ENTRE MESES ===

export function ensureMonthContinuity(monthsData: MonthlyData[]): MonthlyData[] {
  if (!monthsData || monthsData.length <= 1) return monthsData;
  
  const sortedMonths = [...monthsData].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
  
  if (sortedMonths[0].initialBalance === undefined) {
    sortedMonths[0].initialBalance = 0;
  }
  
  for (let i = 0; i < sortedMonths.length - 1; i++) {
    const currentMonth = sortedMonths[i];
    const nextMonth = sortedMonths[i + 1];
    
    let finalBalance = 0;
    
    if (currentMonth.dailyBalances.length > 0) {
      const sortedDays = [...currentMonth.dailyBalances]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      finalBalance = sortedDays[sortedDays.length - 1].balance;
    } else {
      finalBalance = (currentMonth.initialBalance || 0) + currentMonth.performance;
    }
    
    nextMonth.initialBalance = finalBalance;
    updateMonthWithInitialBalance(nextMonth);
  }
  
  return sortedMonths;
}

function updateMonthWithInitialBalance(monthData: MonthlyData): void {
  if (monthData.initialBalance === undefined) {
    monthData.initialBalance = 0;
  }
  
  if (monthData.dailyBalances.length === 0) return;
  
  monthData.dailyBalances.sort((a: DailyBalance, b: DailyBalance) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  let runningBalance = monthData.initialBalance;
  
  monthData.dailyBalances.forEach((day: DailyBalance) => {
    const dailyNet = day.income - day.expense;
    runningBalance += dailyNet;
    day.balance = runningBalance;
  });
  
  monthData.performance = monthData.totalIncome - monthData.totalExpense;
}

// === TRANSAÇÕES ===

export async function addTransaction(
  allMonthsData: MonthlyData[],
  transaction: Transaction
): Promise<MonthlyData[]> {
  try {
    // Salva no Firestore
    await saveTransactionToFirestore(transaction);
    
    // Recarrega os dados atualizados
    const updatedData = await loadData();
    
    return updatedData;
  } catch (error) {
    console.error('Erro ao adicionar transação:', error);
    throw error;
  }
}

export async function removeTransaction(
  allMonthsData: MonthlyData[],
  transactionId: string,
  date: Date
): Promise<MonthlyData[]> {
  try {
    // Remove do Firestore
    await deleteTransactionFromFirestore(transactionId);
    
    // Recarrega os dados atualizados
    const updatedData = await loadData();
    
    return updatedData;
  } catch (error) {
    console.error('Erro ao remover transação:', error);
    throw error;
  }
}

// === TRANSAÇÕES RECORRENTES ===

export async function loadRecurringTransactions(): Promise<RecurringTransaction[]> {
  try {
    return await getRecurringTransactions();
  } catch (error) {
    console.error('Erro ao carregar transações recorrentes:', error);
    return [];
  }
}

export async function saveRecurringTransactions(transactions: RecurringTransaction[]): Promise<void> {
  try {
    // Salva cada transação recorrente individualmente
    for (const transaction of transactions) {
      await saveRecurringTransaction(transaction);
    }
  } catch (error) {
    console.error('Erro ao salvar transações recorrentes:', error);
    throw error;
  }
}

export async function applyRecurringTransactions(
  allMonthsData: MonthlyData[],
  transactions: Transaction[]
): Promise<MonthlyData[]> {
  try {
    // Salva cada transação no Firestore
    for (const transaction of transactions) {
      await saveTransactionToFirestore(transaction);
    }
    
    // Recarrega os dados atualizados
    const updatedData = await loadData();
    
    return updatedData;
  } catch (error) {
    console.error('Erro ao aplicar transações recorrentes:', error);
    throw error;
  }
}

// === LISTENERS EM TEMPO REAL ===

export function subscribeToMonthlyData(
  month: number,
  year: number,
  callback: (monthlyData: MonthlyData | null) => void
): () => void {
  return subscribeToTransactions(month, year, (transactions) => {
    if (transactions.length === 0) {
      callback(null);
      return;
    }
    
    const monthlyData = calculateMonthlyDataFromTransactions(transactions, month, year);
    callback(monthlyData);
  });
}

// === FUNÇÕES AUXILIARES ===

function calculateMonthlyDataFromTransactions(
  transactions: Transaction[],
  month: number,
  year: number
): MonthlyData {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const dailyBalances: DailyBalance[] = Array.from({ length: daysInMonth }, (_, i) => ({
    date: new Date(year, month, i + 1),
    income: 0,
    expense: 0,
    balance: 0,
    dailyTransactions: []
  }));
  
  let totalIncome = 0;
  let totalExpense = 0;
  
  // Processa transações
  transactions.forEach(transaction => {
    const transactionDate = new Date(transaction.date);
    const day = transactionDate.getDate() - 1;
    
    if (day >= 0 && day < daysInMonth) {
      dailyBalances[day].dailyTransactions.push(transaction);
      
      if (transaction.type === 'entrada') {
        dailyBalances[day].income += transaction.amount;
        totalIncome += transaction.amount;
      } else {
        dailyBalances[day].expense += transaction.amount;
        totalExpense += transaction.amount;
      }
    }
  });
  
  // Calcula saldos cumulativos
  let runningBalance = 0;
  dailyBalances.forEach(day => {
    const dailyNet = day.income - day.expense;
    runningBalance += dailyNet;
    day.balance = runningBalance;
  });
  
  return {
    month,
    year,
    initialBalance: 0, // Será calculado pela função de continuidade
    totalIncome,
    totalExpense,
    performance: totalIncome - totalExpense,
    dailyBalances
  };
}

function findPreviousMonth(data: MonthlyData[], month: number, year: number): MonthlyData | undefined {
  let prevMonth = month - 1;
  let prevYear = year;
  
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }
  
  return data.find(m => m.month === prevMonth && m.year === prevYear);
}

function updateBalances(monthData: MonthlyData): void {
  if (monthData.initialBalance !== undefined) {
    updateMonthWithInitialBalance(monthData);
    return;
  }
  
  let runningBalance = 0;
  
  monthData.dailyBalances.sort((a: DailyBalance, b: DailyBalance) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  monthData.dailyBalances.forEach((day: DailyBalance) => {
    const dailyNet = day.income - day.expense;
    runningBalance += dailyNet;
    day.balance = runningBalance;
  });
  
  monthData.performance = monthData.totalIncome - monthData.totalExpense;
}

// === LIMPEZA DE DADOS ===

export async function clearAllData(): Promise<void> {
  try {
    await clearAllUserData();
    console.log('Todos os dados foram removidos do Firestore');
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    throw error;
  }
}