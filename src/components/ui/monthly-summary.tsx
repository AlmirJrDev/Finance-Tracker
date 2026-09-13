import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { addMonths, monthLabel } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import type { MonthSummary } from '@/types/finance';

function Stat({
  title,
  description,
  cents,
  tone,
}: {
  title: string;
  description?: string;
  cents: number;
  tone: 'income' | 'expense' | 'balance';
}) {
  const color =
    tone === 'income' ? 'text-green-500' : tone === 'expense' ? 'text-red-500' : cents < 0 ? 'text-red-500' : 'text-green-500';
  return (
    <Card>
      <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
        <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-0">
        <div className={`text-base sm:text-xl xl:text-2xl font-bold truncate ${color}`}>{formatCents(cents)}</div>
      </CardContent>
    </Card>
  );
}

export function MonthlySummary({ summary }: { summary: MonthSummary }) {
  const resultLabel = `${summary.resultCents >= 0 ? '+' : ''}${formatCents(summary.resultCents)} no mês`;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Stat
        title="Saldo Inicial"
        description={`Final de ${monthLabel(addMonths(summary.month, -1))}`}
        cents={summary.initialBalanceCents}
        tone="balance"
      />
      <Stat title="Receitas" cents={summary.incomeCents} tone="income" />
      <Stat title="Despesas" cents={summary.expenseCents} tone="expense" />
      <Stat title="Saldo Final" description={resultLabel} cents={summary.finalBalanceCents} tone="balance" />
    </div>
  );
}
