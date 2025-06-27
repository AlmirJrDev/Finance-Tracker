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
import { Card, CardContent } from '@/components/ui/card';
import { TutorialGuide } from '@/components/ui/tutorialGuide';
import CategoryBudgetManager from '@/components/ui/CategoryBudgetManager';

import { GoogleDriveSync } from '@/components/googleDriveSync';





export default function HomePage() {
  const [allMonthsData, setAllMonthsData] = useState<MonthlyData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  
  useEffect(() => {
    const storedData = loadData();
    if (storedData && storedData.length > 0) {
      setAllMonthsData(storedData);
    }
    
  }, []);
  
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



  return (
    <div className="container mx-auto py-4 px-12  lg:py-8 lg:px-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Controle Financeiro 2025</h1>
        <div className="flex gap-2">
        <GoogleDriveSync />
          <ModeToggle/>
          <TutorialGuide />
        </div>
      </div>

      <Card className="w-full mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex justify-center md:justify-start">
              <MonthSelector 
                currentMonth={selectedMonth}
                currentYear={selectedYear}
                onMonthChange={handleMonthChange}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowCategoryManager(true)}
                className="text-sm"
              >
                Gerenciar Categorias
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowRecurring(!showRecurring)}
                className="text-sm"
              >
                {showRecurring ? 'Voltar ao Resumo' : 'Transações Recorrentes'}
              </Button>
              <Button 
                onClick={handleAddTransaction} 
                className="flex items-center justify-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                <span className="sm:inline">Nova Transação</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showRecurring ? (
        <RecurringTransactions 
          onAddTransactions={handleApplyRecurringTransactions}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      ) : monthlyData ? (
        <>
          <MonthlySummary data={monthlyData} allMonthsData={allMonthsData} />
          <CategoryCharts data={monthlyData} allMonthsData={allMonthsData} />
          <CategoryBudgetManager data={monthlyData} allMonthsData={allMonthsData} />
          <DailyAllowance data={monthlyData} />
          <RecurringExpenseTracker data={monthlyData} />
          <TransactionsTable 
            dailyBalances={monthlyData.dailyBalances} 
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </>
      ) : (
        <Card className="text-center p-8 rounded-md flex justify-center items-center">
          <h3 className="text-lg font-medium">Nenhum dado disponível para {MONTHS[selectedMonth]} de {selectedYear}</h3>
          <p className="text-gray-500 mb-4">Adicione sua primeira transação para este período.</p>
          <Button onClick={handleAddTransaction} className='w-full md:w-96'>Adicionar Transação</Button>
        </Card>
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

      {/* Easter egg component - hidden until activated with keyboard sequence */}

      <CategoryManager 
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />
    </div>
  );
}