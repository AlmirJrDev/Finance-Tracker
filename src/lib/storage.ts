import { RecurringTransaction } from '@/components/ui/transactions-recurring';
import { MonthlyData, Transaction } from '@/types/finance';

const STORAGE_KEY = 'finance-tracker-data';

// Carrega dados do localStorage
export function loadData(): MonthlyData[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const data = JSON.parse(savedData);
      
      // Converte as string de datas de volta para objetos Date
      return data.map((month: any) => ({
        ...month,
        dailyBalances: month.dailyBalances.map((day: any) => ({
          ...day,
          date: new Date(day.date),
          dailyTransactions: day.dailyTransactions.map((transaction: any) => ({
            ...transaction,
            date: new Date(transaction.date)
          }))
        }))
      }));
    }
    return [];
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return [];
  }
}

// Salva dados no localStorage
export function saveData(data: MonthlyData[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

// Adiciona ou edita uma transação em um mês específico
export function addTransaction(
  allMonthsData: MonthlyData[],
  transaction: Transaction
): MonthlyData[] {
  const date = transaction.date;
  const month = date.getMonth();
  const year = date.getFullYear();
  const day = date.getDate();

  // Antes de tudo, procure e remova a transação se ela já existir em QUALQUER dia
  // (para o caso de estar movendo a transação para outra data)
  const updatedData = JSON.parse(JSON.stringify(allMonthsData));
  
  // Procura em todos os meses
  for (const monthData of updatedData) {
    // Para cada dia do mês
    for (let i = 0; i < monthData.dailyBalances.length; i++) {
      const dailyBalance = monthData.dailyBalances[i];
      
      // Procura a transação pelo ID
      const existingTransIndex = dailyBalance.dailyTransactions.findIndex(
        (t: any) => t.id === transaction.id
      );
      
      // Se encontrou a transação em algum lugar, remova-a e ajuste os totais
      if (existingTransIndex !== -1) {
        const oldTransaction = dailyBalance.dailyTransactions[existingTransIndex];
        
        // Ajusta os totais removendo a transação antiga
        if (oldTransaction.type === 'entrada') {
          monthData.totalIncome -= oldTransaction.amount;
          dailyBalance.income -= oldTransaction.amount;
        } else {
          monthData.totalExpense -= oldTransaction.amount;
          dailyBalance.expense -= oldTransaction.amount;
        }
        
        // Remove a transação
        dailyBalance.dailyTransactions.splice(existingTransIndex, 1);
      }
    }
    
    // Recalcula os saldos do mês após remover a transação
    updateBalances(monthData);
  }
  
  // Agora, adiciona a transação no local correto (dia específico)
  
  // Procura o mês correspondente
  let monthData = updatedData.find(
    (m: MonthlyData) => m.month === month && m.year === year
  );
  
  // Se o mês não existir, cria um novo
  if (!monthData) {
    monthData = {
      month,
      year,
      totalIncome: 0,
      totalExpense: 0,
      performance: 0,
      dailyBalances: Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => ({
        date: new Date(year, month, i + 1),
        income: 0,
        expense: 0,
        balance: 0,
        dailyTransactions: []
      }))
    };
    updatedData.push(monthData);
  }
  
  // Encontra o dia correspondente na nova data
  const dayIndex = monthData.dailyBalances.findIndex(
    (d: any) => new Date(d.date).getDate() === day
  );
  
  if (dayIndex !== -1) {
    // Adiciona a nova transação
    monthData.dailyBalances[dayIndex].dailyTransactions.push({
      ...transaction,
      date: new Date(transaction.date)
    });
    
    // Atualiza os valores do dia
    if (transaction.type === 'entrada') {
      monthData.totalIncome += transaction.amount;
      monthData.dailyBalances[dayIndex].income += transaction.amount;
    } else {
      monthData.totalExpense += transaction.amount;
      monthData.dailyBalances[dayIndex].expense += transaction.amount;
    }
  }
  
  // Recalcula os saldos
  updateBalances(monthData);
  
  // Salva os dados atualizados
  saveData(updatedData);
  
  return updatedData;
}

// Remove uma transação
export function removeTransaction(
  allMonthsData: MonthlyData[],
  transactionId: string,
  date: Date
): MonthlyData[] {
  const month = date.getMonth();
  const year = date.getFullYear();
  const day = date.getDate();

  // Cria uma cópia profunda dos dados
  const updatedData = JSON.parse(JSON.stringify(allMonthsData));
  
  // Procura o mês correspondente
  const monthData = updatedData.find(
    (m: MonthlyData) => m.month === month && m.year === year
  );
  
  if (!monthData) return updatedData;
  
  // Encontra o dia correspondente
  const dayIndex = monthData.dailyBalances.findIndex(
    (d: any) => new Date(d.date).getDate() === day
  );
  
  if (dayIndex === -1) return updatedData;
  
  // Encontra a transação
  const transactionIndex = monthData.dailyBalances[dayIndex].dailyTransactions.findIndex(
    (t: Transaction) => t.id === transactionId
  );
  
  if (transactionIndex === -1) return updatedData;
  
  // Obtém a transação antes de remover
  const transaction = monthData.dailyBalances[dayIndex].dailyTransactions[transactionIndex];
  
  // Atualiza os totais
  if (transaction.type === 'entrada') {
    monthData.totalIncome -= transaction.amount;
    monthData.dailyBalances[dayIndex].income -= transaction.amount;
  } else {
    monthData.totalExpense -= transaction.amount;
    monthData.dailyBalances[dayIndex].expense -= transaction.amount;
  }
  
  // Remove a transação
  monthData.dailyBalances[dayIndex].dailyTransactions.splice(transactionIndex, 1);
  
  // Recalcula os saldos
  updateBalances(monthData);
  
  // Salva os dados atualizados
  saveData(updatedData);
  
  return updatedData;
}

// Recalcula os saldos diários
function updateBalances(monthData: MonthlyData): void {
  let runningBalance = 0;
  
  // Ordena os dias por data
  monthData.dailyBalances.sort((a: any, b: any) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  // Recalcula o saldo para cada dia
  monthData.dailyBalances.forEach((day: any) => {
    const dailyNet = day.income - day.expense;
    runningBalance += dailyNet;
    day.balance = runningBalance;
  });
  
  // Atualiza a performance do mês
  monthData.performance = monthData.totalIncome - monthData.totalExpense;
}

export function applyRecurringTransactions(
  allMonthsData: MonthlyData[],
  transactions: Transaction[]
): MonthlyData[] {
  // Cria uma cópia profunda dos dados para não modificar o original
  const updatedData = JSON.parse(JSON.stringify(allMonthsData));
  
  // Processa cada transação
  for (const transaction of transactions) {
    // Verifica se a transação já existe para evitar duplicatas
    const existingMonth = updatedData.find(
      month => month.month === transaction.date.getMonth() && 
               month.year === transaction.date.getFullYear()
    );
    
    if (existingMonth) {
      // Procura o dia específico ou cria um novo
      const targetDay = transaction.date.getDate();
      let dailyBalance = existingMonth.dailyBalances.find(
        day => new Date(day.date).getDate() === targetDay
      );
      
      // Se o dia não existir, cria um novo
      if (!dailyBalance) {
        dailyBalance = {
          date: new Date(transaction.date),
          income: 0,
          expense: 0,
          balance: 0,
          dailyTransactions: []
        };
        existingMonth.dailyBalances.push(dailyBalance);
      }
      
      // Adiciona a transação ao dia
      dailyBalance.dailyTransactions.push({
        ...transaction,
        // Certifica-se de que a data é um objeto Date
        date: new Date(transaction.date)
      });
      
      // Atualiza os valores do dia
      if (transaction.type === 'entrada') {
        dailyBalance.income += transaction.amount;
        existingMonth.totalIncome += transaction.amount;
      } else {
        dailyBalance.expense += transaction.amount;
        existingMonth.totalExpense += transaction.amount;
      }
      
      // Atualiza o saldo do mês
      existingMonth.performance = existingMonth.totalIncome - existingMonth.totalExpense;
      
      // Reordena por data e recalcula os saldos acumulados
      existingMonth.dailyBalances.sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      let runningBalance = 0;
      for (const day of existingMonth.dailyBalances) {
        runningBalance += (day.income - day.expense);
        day.balance = runningBalance;
      }
    } else {
      // Cria um novo mês se não existir
      const newMonthData: MonthlyData = {
        month: transaction.date.getMonth(),
        year: transaction.date.getFullYear(),
        totalIncome: transaction.type === 'entrada' ? transaction.amount : 0,
        totalExpense: transaction.type === 'saída' ? transaction.amount : 0,
        performance: transaction.type === 'entrada' ? transaction.amount : -transaction.amount,
        dailyBalances: [{
          date: new Date(transaction.date),
          income: transaction.type === 'entrada' ? transaction.amount : 0,
          expense: transaction.type === 'saída' ? transaction.amount : 0,
          balance: transaction.type === 'entrada' ? transaction.amount : -transaction.amount,
          dailyTransactions: [{ ...transaction, date: new Date(transaction.date) }]
        }]
      };
      
      updatedData.push(newMonthData);
    }
  }
  
  // Salva os dados atualizados
  saveData(updatedData);
  
  return updatedData;
}

// Função para carregar transações recorrentes
export function loadRecurringTransactions(): RecurringTransaction[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem('recurringTransactions');
  return stored ? JSON.parse(stored) : [];
}

// Função para salvar transações recorrentes
export function saveRecurringTransactions(transactions: RecurringTransaction[]): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('recurringTransactions', JSON.stringify(transactions));
}