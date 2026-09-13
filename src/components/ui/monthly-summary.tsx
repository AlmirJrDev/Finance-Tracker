import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { addMonths, monthLabel } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import type { MonthSummary } from '@/types/finance';

function Stat({
  title,
  description,
  footnote,
  cents,
  tone,
}: {
  title: string;
  description?: string;
  footnote?: string;
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
        {footnote && <p className="mt-1 text-xs text-muted-foreground">{footnote}</p>}
      </CardContent>
    </Card>
  );
}

export function MonthlySummary({ summary }: { summary: MonthSummary }) {
  const resultLabel = `${summary.resultCents >= 0 ? '+' : ''}${formatCents(summary.resultCents)} no mês`;
  const hasPending = summary.pendingCount > 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Stat
        title="Saldo Inicial"
        description={`Final de ${monthLabel(addMonths(summary.month, -1))}`}
        cents={summary.initialBalanceCents}
        tone="balance"
      />
      <Stat
        title="Receitas"
        cents={summary.incomeCents}
        tone="income"
        footnote={summary.pendingIncomeCents > 0 ? `${formatCents(summary.pendingIncomeCents)} a receber` : undefined}
      />
      <Stat
        title="Despesas"
        cents={summary.expenseCents}
        tone="expense"
        footnote={summary.pendingExpenseCents > 0 ? `${formatCents(summary.pendingExpenseCents)} a pagar` : undefined}
      />
      <Stat
        title={hasPending ? 'Saldo Final Previsto' : 'Saldo Final'}
        description={resultLabel}
        cents={summary.finalBalanceCents}
        tone="balance"
        footnote={[
          hasPending ? `${formatCents(summary.paidFinalBalanceCents)} considerando só o que foi pago` : null,
          summary.otherMovementsCents !== 0
            ? `inclui ${summary.otherMovementsCents > 0 ? '+' : ''}${formatCents(summary.otherMovementsCents)} em transferências e ajustes`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined}
      />
    </div>
  );
}
