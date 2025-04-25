import { RecurringTransaction } from '@/components/ui/transactions-recurring';
import { MonthlyData, Transaction, DailyBalance } from '@/types/finance';

const STORAGE_KEY = 'finance-tracker-data';

// Carrega dados do localStorage
export function loadData(): MonthlyData[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const data = JSON.parse(savedData);
      
      // Converte as string de datas de volta para objetos Date
      const parsedData = data.map((month: any) => ({
        ...month,
        initialBalance: month.initialBalance || 0, // Garante que initialBalance exista
        dailyBalances: month.dailyBalances.map((day: any) => ({
          ...day,
          date: new Date(day.date),
          dailyTransactions: day.dailyTransactions.map((transaction: any) => ({
            ...transaction,
            date: new Date(transaction.date)
          }))
        }))
      }));

      // Aplica o carryover entre meses após carregar os dados
      return ensureMonthContinuity(parsedData);
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

// Nova função para garantir a continuidade entre meses
export function ensureMonthContinuity(monthsData: MonthlyData[]): MonthlyData[] {
  if (!monthsData || monthsData.length <= 1) return monthsData;
  
  // Ordena os meses cronologicamente
  const sortedMonths = [...monthsData].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
  
  // Garante que o primeiro mês tenha initialBalance (mesmo que seja 0)
  if (sortedMonths[0].initialBalance === undefined) {
    sortedMonths[0].initialBalance = 0;
  }
  
  // Propaga o saldo final de cada mês para o inicial do próximo
  for (let i = 0; i < sortedMonths.length - 1; i++) {
    const currentMonth = sortedMonths[i];
    const nextMonth = sortedMonths[i + 1];
    
    // Calcula o saldo final do mês atual
    let finalBalance = 0;
    
    // Se houver dias registrados, usa o último saldo diário
    if (currentMonth.dailyBalances.length > 0) {
      const sortedDays = [...currentMonth.dailyBalances]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      finalBalance = sortedDays[sortedDays.length - 1].balance;
    } else {
      // Se não houver dias, usa saldo inicial + performance
      finalBalance = (currentMonth.initialBalance || 0) + currentMonth.performance;
    }
    
    // Define o saldo inicial do próximo mês
    nextMonth.initialBalance = finalBalance;
    
    // Recalcula os saldos para o próximo mês com o novo saldo inicial
    updateMonthWithInitialBalance(nextMonth);
  }
  
  return sortedMonths;
}

// Função para recalcular os saldos com base no saldo inicial
function updateMonthWithInitialBalance(monthData: MonthlyData): void {
  // Garante que initialBalance sempre tenha um valor
  if (monthData.initialBalance === undefined) {
    monthData.initialBalance = 0;
  }
  
  // Se não houver dias registrados, não há o que recalcular
  if (monthData.dailyBalances.length === 0) return;
  
  // Ordena os dias por data
  monthData.dailyBalances.sort((a: DailyBalance, b: DailyBalance) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  // Recalcula o saldo para cada dia, começando do saldo inicial
  let runningBalance = monthData.initialBalance;
  
  monthData.dailyBalances.forEach((day: DailyBalance) => {
    // Calcula o saldo líquido do dia (receitas - despesas)
    const dailyNet = day.income - day.expense;
    runningBalance += dailyNet;
    day.balance = runningBalance;
  });
  
  // Atualiza a performance do mês (diferença entre receitas e despesas)
  monthData.performance = monthData.totalIncome - monthData.totalExpense;
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
        (t: Transaction) => t.id === transaction.id
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
    // Procura o mês anterior para pegar o saldo final como inicial
    const previousMonthData = findPreviousMonth(updatedData, month, year);
    let initialBalance = 0;
    
    if (previousMonthData) {
      // Calcula o saldo final do mês anterior
      if (previousMonthData.dailyBalances.length > 0) {
        const sortedDays = [...previousMonthData.dailyBalances].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        initialBalance = sortedDays[sortedDays.length - 1].balance;
      } else {
        // Garante que initialBalance nunca seja undefined
        initialBalance = (previousMonthData.initialBalance || 0) + previousMonthData.performance;
      }
    }
    
    monthData = {
      month,
      year,
      initialBalance, // Já garantimos que tem valor acima
      totalIncome: 0,
      totalExpense: 0,
      performance: 0,
      dailyBalances: Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => ({
        date: new Date(year, month, i + 1),
        income: 0,
        expense: 0,
        balance: initialBalance, // Inicializa com o saldo inicial do mês
        dailyTransactions: []
      }))
    };
    updatedData.push(monthData);
  }
  
  // Encontra o dia correspondente na nova data
  const dayIndex = monthData.dailyBalances.findIndex(
    (d: DailyBalance) => new Date(d.date).getDate() === day
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
  
  // Recalcula os saldos com base no saldo inicial
  updateMonthWithInitialBalance(monthData);
  
  // Aplica o carryover para os meses futuros
  const result = ensureMonthContinuity(updatedData);
  
  // Salva os dados atualizados
  saveData(result);
  
  return result;
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
    (d: DailyBalance) => new Date(d.date).getDate() === day
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
  
  // Recalcula os saldos do mês atual
  updateMonthWithInitialBalance(monthData);
  
  // Aplica o carryover para os meses futuros
  const result = ensureMonthContinuity(updatedData);
  
  // Salva os dados atualizados
  saveData(result);
  
  return result;
}

// Função auxiliar para encontrar o mês anterior
function findPreviousMonth(data: MonthlyData[], month: number, year: number): MonthlyData | undefined {
  let prevMonth = month - 1;
  let prevYear = year;
  
  if (prevMonth < 0) {
    prevMonth = 11; // Dezembro
    prevYear -= 1;
  }
  
  return data.find(m => m.month === prevMonth && m.year === prevYear);
}

// Recalcula os saldos diários (mantendo compatibilidade com o código existente)
function updateBalances(monthData: MonthlyData): void {
  // Se o mês tem um saldo inicial definido, use-o
  if (monthData.initialBalance !== undefined) {
    updateMonthWithInitialBalance(monthData);
    return;
  }
  
  // Comportamento original para compatibilidade
  let runningBalance = 0;
  
  // Ordena os dias por data
  monthData.dailyBalances.sort((a: DailyBalance, b: DailyBalance) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  
  // Recalcula o saldo para cada dia
  monthData.dailyBalances.forEach((day: DailyBalance) => {
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
      (month: MonthlyData) => month.month === transaction.date.getMonth() && 
               month.year === transaction.date.getFullYear()
    );
    
    if (existingMonth) {
      // Procura o dia específico ou cria um novo
      const targetDay = transaction.date.getDate();
      let dailyBalance = existingMonth.dailyBalances.find(
        (day: DailyBalance) => new Date(day.date).getDate() === targetDay
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
      
      // Recalcula os saldos com o saldo inicial
      updateMonthWithInitialBalance(existingMonth);
    } else {
      // Encontrar o mês anterior para pegar o saldo inicial
      const previousMonthData = findPreviousMonth(
        updatedData, 
        transaction.date.getMonth(), 
        transaction.date.getFullYear()
      );
      
      let initialBalance = 0;
      if (previousMonthData) {
        // Calcula o saldo final do mês anterior
        if (previousMonthData.dailyBalances.length > 0) {
          const sortedDays = [...previousMonthData.dailyBalances].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          initialBalance = sortedDays[sortedDays.length - 1].balance;
        } else {
          // Garante que initialBalance nunca seja undefined
          initialBalance = (previousMonthData.initialBalance || 0) + previousMonthData.performance;
        }
      }
      
      // Cria um novo mês se não existir
      const newMonthData: MonthlyData = {
        month: transaction.date.getMonth(),
        year: transaction.date.getFullYear(),
        initialBalance, // Já garantimos que tem valor acima
        totalIncome: transaction.type === 'entrada' ? transaction.amount : 0,
        totalExpense: transaction.type === 'saída' ? transaction.amount : 0,
        performance: transaction.type === 'entrada' ? transaction.amount : -transaction.amount,
        dailyBalances: [{
          date: new Date(transaction.date),
          income: transaction.type === 'entrada' ? transaction.amount : 0,
          expense: transaction.type === 'saída' ? transaction.amount : 0,
          balance: initialBalance + (transaction.type === 'entrada' ? transaction.amount : -transaction.amount),
          dailyTransactions: [{ ...transaction, date: new Date(transaction.date) }]
        }]
      };
      
      updatedData.push(newMonthData);
    }
  }
  
  // Aplica o carryover para garantir a continuidade dos saldos
  const result = ensureMonthContinuity(updatedData);
  
  // Salva os dados atualizados
  saveData(result);
  
  return result;
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