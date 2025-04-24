'use client';

import { useEffect, useState } from 'react';
import { MonthSelector } from '@/components/ui/month-selector';
import { Button } from '@/components/ui/button';
import TransactionForm from '@/components/forms/transaction-form';
import CategoryManager from '@/components/ui/category-manager';
import { MONTHS } from '@/lib/data';
import { MonthlyData, Transaction } from '@/types/finance';
import { Plus } from 'lucide-react';
import { 
  loadData, 

  addTransaction, 
  removeTransaction,
  applyRecurringTransactions 
} from '@/lib/storage';
import { MonthlySummary } from '@/components/ui/monthly-summary';
import { TransactionsTable } from '@/components/ui/transactions-table';
import RecurringTransactions from '@/components/ui/transactions-recurring';
import DailyAllowance from '@/components/ui/daily-allowance';
import CategoryCharts from '@/components/ui/categoria-chart';
import { ModeToggle } from '@/components/ui/themeSwitcher';
import RecurringExpenseTracker from '@/components/ui/RecurringExpenseTracker';


export default function HomePage() {
  // Iniciar com array vazio ao invés de INITIAL_DATA
  const [allMonthsData, setAllMonthsData] = useState<MonthlyData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  // Carrega dados do localStorage quando o componente é montado
  useEffect(() => {
    const storedData = loadData();
    if (storedData && storedData.length > 0) {
      setAllMonthsData(storedData);
    }
    // Removida a parte que usava INITIAL_DATA
  }, []);
  
  // Usar o mês atual como padrão
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const availableMonths = allMonthsData.length > 0 
    ? allMonthsData.map(data => ({ month: data.month, year: data.year }))
    : [{ month: currentMonth, year: currentYear }];
  
  const defaultMonth = availableMonths.length > 0 
    ? availableMonths[availableMonths.length - 1] 
    : { month: currentMonth, year: currentYear };
  
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth.month);
  const [selectedYear, setSelectedYear] = useState<number>(defaultMonth.year);

  const monthlyData = allMonthsData.find(
    data => data.month === selectedMonth && data.year === selectedYear
  );

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };
  
  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };
  
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };
  
  const handleDeleteTransaction = (transactionId: string, date: Date) => {
    const updatedData = removeTransaction(allMonthsData, transactionId, date);
    setAllMonthsData(updatedData);
  };
  
  const handleSaveTransaction = (transaction: Transaction) => {
    const updatedData = addTransaction(allMonthsData, transaction);
    setAllMonthsData(updatedData);
    setIsFormOpen(false);
    setEditingTransaction(null);
  };
  
  const handleApplyRecurringTransactions = (transactions: Transaction[]) => {
    const updatedData = applyRecurringTransactions(allMonthsData, transactions);
    setAllMonthsData(updatedData);
  };

  // const clearAppData = () => {
  //   // Remove apenas os dados do seu aplicativo
  //   localStorage.removeItem('financialData'); // Ajuste para a chave que você usa
  //   alert('Dados do aplicativo removidos com sucesso!');
    
  //   // Se quiser atualizar o estado da aplicação também
  //   setAllMonthsData([]);
  // };

  return (
    <div className="container mx-auto py-8 px-24">
     <div className="flex justify-between items-center mb-6">
  <h1 className="text-3xl font-bold">Controle Financeiro 2025</h1>
  <div className="flex gap-2">
    <ModeToggle/>
    <Button 
      variant="outline" 
      onClick={() => setShowCategoryManager(true)}
    >
      Gerenciar Categorias
    </Button>
    <Button 
      variant="outline" 
      onClick={() => setShowRecurring(!showRecurring)}
    >
      {showRecurring ? 'Voltar ao Resumo' : 'Transações Recorrentes'}
    </Button>
    <Button onClick={handleAddTransaction} className="flex items-center gap-2">
      <Plus className="h-4 w-4" />
      Nova Transação
    </Button>
  </div>
</div>
      
      <MonthSelector 
        availableMonths={availableMonths}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        onMonthChange={handleMonthChange}
      />
      
      {showRecurring ? (
  <RecurringTransactions 
    onAddTransactions={handleApplyRecurringTransactions}
    selectedMonth={selectedMonth}
    selectedYear={selectedYear}
  />
) : monthlyData ? (
  <>
    <MonthlySummary data={monthlyData} />
    <CategoryCharts data={monthlyData} allMonthsData={allMonthsData} />
    <DailyAllowance data={monthlyData} />
<RecurringExpenseTracker data={monthlyData} />
<TransactionsTable 
  dailyBalances={monthlyData.dailyBalances} 
  onEditTransaction={handleEditTransaction}
  onDeleteTransaction={handleDeleteTransaction}
/>
  </>
) : (
  
        <div className="text-center p-8 bg-gray-100 rounded-md">
          <h3 className="text-lg font-medium">Nenhum dado disponível para {MONTHS[selectedMonth]} de {selectedYear}</h3>
          <p className="text-gray-500 mb-4">Adicione sua primeira transação para este período.</p>
          <Button onClick={handleAddTransaction}>Adicionar Transação</Button>
        </div>
      )}

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        editTransaction={editingTransaction}
        currentDate={new Date(selectedYear, selectedMonth, new Date().getDate())}
      />
      {/* <LocalStorageViewer/> <Button onClick={clearAppData} variant="destructive">Limpar Dados do App</Button> */}
      <CategoryManager 
  isOpen={showCategoryManager}
  onClose={() => setShowCategoryManager(false)}
/>
    </div>
  );
}