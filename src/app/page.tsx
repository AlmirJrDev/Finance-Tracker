'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MonthSelector } from '@/components/ui/month-selector';
import { Button } from '@/components/ui/button';
import TransactionForm from '@/components/forms/transaction-form';
import CategoryManager from '@/components/ui/category-manager';
import { MONTHS } from '@/lib/data';
import { MonthlyData, Transaction } from '@/types/finance';
import { Plus, Loader2 } from 'lucide-react';
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
import { UserAvatarPopover } from '@/components/ui/user';
import api from '@/lib/api';
import { useBackendAuth } from '@/lib/useBackendAuth';


function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (value.$numberDecimal) return parseFloat(value.$numberDecimal) || 0;
  return 0;
}

function apiToMonthlyData(summary: any, transactions: any[]): MonthlyData {
  const year = summary?.year || new Date().getFullYear();
  const month = summary?.month || new Date().getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Agrupa transações por dia usando UTC para evitar problema de fuso
  const byDay: Record<number, any[]> = {};
for (const t of transactions) {
  const day = new Date(t.date).getUTCDate()  
  if (!byDay[day]) byDay[day] = [];
  byDay[day].push(t);
}

  const dailyBalancesFromApi: Record<number, any> = {};
 if (summary?.dailyBalances) {
  for (const d of summary.dailyBalances) {
    const day = new Date(d.date).getUTCDate()  // ← UTC
    dailyBalancesFromApi[day] = d;
  }
  }

  console.log('byDay keys:', Object.keys(byDay))
console.log('transactions[0] UTC day:', new Date(transactions[0]?.date).getUTCDate())

  const initialBalance = toNumber(summary?.initialBalance);
  let runningBalance = initialBalance;

  const dailyBalances = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const apiDay = dailyBalancesFromApi[day];
    const dayTransactions = byDay[day] || [];

    const dayIncome = dayTransactions
      .filter((t: any) => t.type === 'entrada')
      .reduce((sum: number, t: any) => sum + toNumber(t.amount), 0);

    const dayExpense = dayTransactions
      .filter((t: any) => t.type === 'saída')
      .reduce((sum: number, t: any) => sum + toNumber(t.amount), 0);

    runningBalance += dayIncome - dayExpense;

    return {
      date: new Date(year, month - 1, day),
      income: apiDay ? toNumber(apiDay.income) : dayIncome,
      expense: apiDay ? toNumber(apiDay.expense) : dayExpense,
      balance: runningBalance,
      dailyTransactions: dayTransactions.map((t: any) => ({
        id: t._id,
        date: new Date(t.date),
        description: t.description,
        amount: toNumber(t.amount),
        type: t.type,
        category: t.categoryName || t.category || '',
        note: t.note || '',
      })),
    };
  });

  return {
    month: month - 1,
    year,
    initialBalance,
    totalIncome: toNumber(summary?.totalIncome),
    totalExpense: toNumber(summary?.totalExpense),
    performance: toNumber(summary?.performance),
    dailyBalances,
  };
}

export default function HomePage() {
  useBackendAuth()
  const { data: session, status } = useSession();

  const [allMonthsData, setAllMonthsData] = useState<MonthlyData[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Carrega os dados do mês selecionado via API
  const loadMonthData = useCallback(async (year: number, month: number) => {
    if (!session) return;
    setIsLoading(true);
    setError(null);

    try {
      const apiMonth = month + 1; // API usa 1-12, componentes usam 0-11

   const [summaryRes, transactionsRes] = await Promise.all([
  api.getMonthlySummary(year, apiMonth).catch(e => { console.error('summary error:', e); return { data: null } }),
  api.getTransactionsByMonth(year, apiMonth),
]);

      console.log('transactions raw:', transactionsRes.data.slice(0, 2))
console.log('summary raw:', summaryRes.data)

      const monthlyData = apiToMonthlyData(summaryRes.data, transactionsRes.data);

      setAllMonthsData((prev) => {
        const others = prev.filter((m) => !(m.month === month && m.year === year));
        return [...others, monthlyData];
      });
    } catch (err: any) {
      setError('Erro ao carregar dados: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Carrega todos os meses disponíveis para o MonthSelector
  const loadAllMonths = useCallback(async () => {
    if (!session) return;

  // Aguarda o token do backend estar disponível
  let attempts = 0;
  while (!api.getToken() && attempts < 10) {
    await new Promise(r => setTimeout(r, 300));
    attempts++;
  }

  if (!api.getToken()) {
    setError('Não foi possível autenticar com o backend.');
    return;
  }
    try {
      const res = await api.getAllMonths();
      if (res.data.length > 0) {
        // Carrega o mês mais recente completo
        const latest = res.data[0]; // já vem ordenado desc
        setSelectedMonth(latest.month - 1);
        setSelectedYear(latest.year);
        await loadMonthData(latest.year, latest.month - 1);
      } else {
        // Sem dados ainda, carrega mês atual
        await loadMonthData(currentYear, currentMonth);
      }
    } catch {
      await loadMonthData(currentYear, currentMonth);
    }
  }, [session, loadMonthData, currentYear, currentMonth]);

  useEffect(() => {
    if (session) loadAllMonths();
  }, [session, loadAllMonths]);

  const handleMonthChange = async (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    await loadMonthData(year, month);
  };

  const monthlyData = allMonthsData.find(
    (data) => data.month === selectedMonth && data.year === selectedYear
  );


  // ─── Handlers de transações ──────────────────────────────────────────────────

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDeleteTransaction = async (transactionId: string, date: Date) => {
    try {
      await api.deleteTransaction(transactionId);
      await loadMonthData(date.getFullYear(), date.getMonth());
    } catch (err: any) {
      setError('Erro ao remover transação: ' + err.message);
    }
  };

  const handleSaveTransaction = async (transaction: Transaction) => {
    try {
      const payload = {
        date: transaction.date.toISOString().split('T')[0],
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type as 'entrada' | 'saída',
        category: transaction.category || undefined,
        note: transaction.note || undefined,
      };

      if (editingTransaction?.id && !editingTransaction.id.startsWith('temp-')) {
        await api.updateTransaction(editingTransaction.id, payload);
      } else {
        await api.createTransaction(payload);
      }

      await loadMonthData(transaction.date.getFullYear(), transaction.date.getMonth());
      setIsFormOpen(false);
      setEditingTransaction(null);
    } catch (err: any) {
      setError('Erro ao salvar transação: ' + err.message);
    }
  };

  const handleApplyRecurringTransactions = async () => {
   
    await loadMonthData(selectedYear, selectedMonth);
  };

  // ─── Renderização ─────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-4 px-12 lg:py-8 lg:px-32 flex justify-center items-center min-h-screen">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-8">Controle Financeiro</h1>
          <GoogleDriveSync />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-12 lg:py-8 lg:px-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Controle Financeiro</h1>
        <div className="flex gap-2">
          <ModeToggle />
          <TutorialGuide />
          <UserAvatarPopover />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
          <button className="ml-2 underline" onClick={() => setError(null)}>fechar</button>
        </div>
      )}

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

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : showRecurring ? (
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
        <Card className="text-center p-8 rounded-md flex flex-col justify-center items-center gap-4">
          <h3 className="text-lg font-medium">
            Nenhum dado disponível para {MONTHS[selectedMonth]} de {selectedYear}
          </h3>
          <p className="text-gray-500">Adicione sua primeira transação para este período.</p>
          <Button onClick={handleAddTransaction} className="w-full md:w-96">
            Adicionar Transação
          </Button>
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

      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
      />
    </div>
  );
}