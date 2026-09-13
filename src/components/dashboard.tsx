'use client';

import { useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MonthSelector } from '@/components/ui/month-selector';
import { MonthlySummary } from '@/components/ui/monthly-summary';
import CategoryCharts from '@/components/ui/categoria-chart';
import CategoryBudgetManager from '@/components/ui/CategoryBudgetManager';
import DailyAllowance from '@/components/ui/daily-allowance';
import RecurringExpenseTracker from '@/components/ui/RecurringExpenseTracker';
import { TransactionsTable } from '@/components/ui/transactions-table';
import RecurringTransactions from '@/components/ui/transactions-recurring';
import CategoryManager from '@/components/ui/category-manager';
import AnnualView from '@/components/ui/AnnualView';
import TransactionForm from '@/components/forms/transaction-form';
import { ModeToggle } from '@/components/ui/themeSwitcher';
import { TutorialGuide } from '@/components/ui/tutorialGuide';
import { UserAvatarPopover } from '@/components/ui/user';
import { DeleteTransactionDialog } from '@/components/forms/delete-transaction-dialog';
import { ProjectionPanel } from '@/components/projection-panel';
import { useActiveMonths, useMonthSummary, useMonthTransactions, useSetTransactionStatus } from '@/hooks/use-finance';
import { currentMonthStr, monthLabel } from '@/lib/dates';
import type { Transaction } from '@/types/finance';

type View = 'month' | 'recurring' | 'annual';

export function Dashboard() {
  const [month, setMonth] = useState(currentMonthStr);
  const [view, setView] = useState<View>('month');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const summary = useMonthSummary(month);
  const transactions = useMonthTransactions(month);
  const activeMonths = useActiveMonths();
  const setStatus = useSetTransactionStatus();

  // Se o mês atual está vazio, abre no mês mais recente com movimento (uma única vez)
  const [checkedLatest, setCheckedLatest] = useState(false);
  if (!checkedLatest && activeMonths.data) {
    setCheckedLatest(true);
    const latest = activeMonths.data[0]?.month;
    const hasCurrent = activeMonths.data.some((m) => m.month === currentMonthStr());
    if (latest && !hasCurrent && latest < currentMonthStr()) setMonth(latest);
  }

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setFormOpen(true);
  };

  const handleToggleStatus = async (t: Transaction) => {
    const status = t.status === 'paid' ? 'pending' : 'paid';
    try {
      await setStatus.mutateAsync({ ids: [t.id], status });
      toast.success(
        status === 'paid' ? `Marcado como ${t.type === 'income' ? 'recebido' : 'pago'}.` : 'Marcado como pendente.',
        { description: t.description }
      );
    } catch (err) {
      toast.error('Erro ao atualizar', { description: (err as Error).message });
    }
  };

  const loadError = summary.error ?? transactions.error;
  const isEmpty = summary.data?.transactionCount === 0 && summary.data.initialBalanceCents === 0;

  return (
    <div className="container mx-auto py-4 px-4 sm:px-8 lg:py-8 lg:px-12 2xl:px-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-3xl font-bold">Controle Financeiro</h1>
        <div className="flex gap-2">
          <ModeToggle />
          <TutorialGuide />
          <UserAvatarPopover />
        </div>
      </div>

      <Card className="w-full mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
            <div className="flex justify-center xl:justify-start">
              {view !== 'annual' && (
                <MonthSelector month={month} onChange={setMonth} activeMonths={activeMonths.data ?? []} />
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center xl:justify-end gap-2">
              <Button variant="outline" onClick={() => setCategoriesOpen(true)} className="text-sm">
                Categorias
              </Button>
              <Button
                variant={view === 'recurring' ? 'secondary' : 'outline'}
                onClick={() => setView(view === 'recurring' ? 'month' : 'recurring')}
                className="text-sm"
              >
                {view === 'recurring' ? 'Voltar' : 'Recorrentes'}
              </Button>
              <Button
                variant={view === 'annual' ? 'secondary' : 'outline'}
                onClick={() => setView(view === 'annual' ? 'month' : 'annual')}
                className="text-sm"
              >
                {view === 'annual' ? 'Visão Mensal' : 'Visão Anual'}
              </Button>
              <Button onClick={openNew} className="flex items-center justify-center gap-1 text-sm">
                <Plus className="h-4 w-4" />
                Nova Transação
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {view === 'annual' && (
        <AnnualView
          initialYear={Number(month.slice(0, 4))}
          onSelectMonth={(m) => {
            setMonth(m);
            setView('month');
          }}
        />
      )}

      {view === 'recurring' && <RecurringTransactions month={month} />}

      {view === 'month' &&
        (loadError ? (
          <Card className="p-8 text-center space-y-3">
            <p className="font-medium">Não foi possível carregar {monthLabel(month)}.</p>
            <p className="text-sm text-muted-foreground">{loadError.message}</p>
            <Button
              variant="outline"
              onClick={() => {
                summary.refetch();
                transactions.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
          </Card>
        ) : !summary.data || !transactions.data ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <div className={summary.isPlaceholderData || transactions.isPlaceholderData ? 'opacity-60 transition-opacity' : ''}>
            <ProjectionPanel />
            <MonthlySummary summary={summary.data} />
            {isEmpty ? (
              <Card className="text-center p-8 rounded-md flex flex-col justify-center items-center gap-4 mb-6">
                <h3 className="text-lg font-medium">Nenhuma movimentação em {monthLabel(month)}</h3>
                <p className="text-muted-foreground">Adicione sua primeira transação para este período.</p>
                <Button onClick={openNew} className="w-full md:w-96">
                  Adicionar Transação
                </Button>
              </Card>
            ) : (
              <>
                <CategoryCharts summary={summary.data} />
                <CategoryBudgetManager month={month} />
                <DailyAllowance key={`${month}:${summary.data.resultCents}`} summary={summary.data} />
                <RecurringExpenseTracker key={month} month={month} />
              </>
            )}
            <TransactionsTable
              summary={summary.data}
              transactions={transactions.data}
              onEdit={openEdit}
              onDelete={setDeleting}
              onToggleStatus={handleToggleStatus}
            />
          </div>
        ))}

      <TransactionForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        transaction={editing}
        month={month}
        onSaved={(saved) => {
          // Leva o usuário ao mês da transação salva
          const savedMonth = saved.date.slice(0, 7);
          if (view === 'month' && savedMonth !== month) setMonth(savedMonth);
        }}
      />

      <DeleteTransactionDialog transaction={deleting} onClose={() => setDeleting(null)} />

      <CategoryManager open={categoriesOpen} onOpenChange={setCategoriesOpen} />
    </div>
  );
}
