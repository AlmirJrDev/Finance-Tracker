'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, CircleAlert, Loader2, Repeat, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { useBudgets, useOverdueTransactions, useProjection, useSetTransactionStatus } from '@/hooks/use-finance';
import { daysBetween, formatDate, formatDayShort } from '@/lib/dates';
import { formatCents, formatCentsShort } from '@/lib/money';
import type { UpcomingItem } from '@/types/finance';

const RANGES = [
  { days: 30, label: '30 dias' },
  { days: 90, label: '3 meses' },
  { days: 180, label: '6 meses' },
] as const;

const chartConfig: ChartConfig = { balanceCents: { label: 'Saldo previsto', color: 'var(--primary)' } };

type Severity = 'critical' | 'warning';

function Alert({ severity, children, action }: { severity: Severity; children: React.ReactNode; action?: React.ReactNode }) {
  const Icon = severity === 'critical' ? CircleAlert : AlertTriangle;
  const tone =
    severity === 'critical'
      ? 'border-red-600/40 bg-red-500/5 text-red-700 dark:text-red-300'
      : 'border-amber-500/40 bg-amber-500/5 text-amber-800 dark:text-amber-300';
  return (
    <li className={`flex flex-col gap-2 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between ${tone}`}>
      <span className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
        <span>
          <span className="sr-only">{severity === 'critical' ? 'Crítico: ' : 'Atenção: '}</span>
          {children}
        </span>
      </span>
      {action}
    </li>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; balanceCents: number } }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <div className="font-medium">{formatDayShort(point.date)}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        <span className="text-muted-foreground">Saldo previsto</span>
        <span className="ml-auto font-medium tabular-nums">{formatCents(point.balanceCents)}</span>
      </div>
    </div>
  );
}

function UpcomingRow({ item, today, onPay, paying }: { item: UpcomingItem; today: string; onPay: () => void; paying: boolean }) {
  const income = item.type === 'income';
  const inDays = daysBetween(today, item.date);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm">
          {item.description}
          {item.installment && (
            <span className="text-xs text-muted-foreground">
              {' '}
              ({item.installment.number}/{item.installment.total})
            </span>
          )}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          {item.virtual && <Repeat className="h-3 w-3" aria-hidden />}
          {inDays === 0 ? 'Hoje' : inDays === 1 ? 'Amanhã' : formatDayShort(item.date)}
          {item.virtual && ' · recorrência ainda não gerada'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`whitespace-nowrap text-sm tabular-nums ${income ? 'text-green-600' : 'text-red-600'}`}>
          {income ? '+' : '-'}
          {formatCents(item.amountCents)}
        </span>
        {item.id && (
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={onPay} disabled={paying} aria-label={`Marcar ${item.description} como ${income ? 'recebido' : 'pago'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </li>
  );
}

export function ProjectionPanel({ accountId, accountName }: { accountId?: string; accountName?: string }) {
  const [days, setDays] = useState<number>(90);
  const { data, isLoading, error, isPlaceholderData } = useProjection(days, accountId);
  const month = data?.today.slice(0, 7);
  const budgets = useBudgets(month ?? '');
  const overdue = useOverdueTransactions(data?.today ?? '', Boolean(data && data.overdue.count > 0), accountId);
  const setStatus = useSetTransactionStatus();

  if (error) {
    return (
      <Card className="mb-6 p-6 text-sm text-muted-foreground">Não foi possível calcular a projeção: {error.message}</Card>
    );
  }

  if (isLoading || !data) {
    return (
      <Card className="mb-6 flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const pay = async (ids: string[], label: string) => {
    try {
      await setStatus.mutateAsync({ ids, status: 'paid' });
      toast.success(label);
    } catch (err) {
      toast.error('Não foi possível atualizar', { description: (err as Error).message });
    }
  };

  // Orçamentos valem para todas as contas; só aparecem na visão geral
  const budgetAlerts = (month && !accountId ? budgets.data : undefined)?.filter((b) => b.level !== 'ok') ?? [];
  const endDate = data.points.at(-1)!.date;
  const hasAlerts = data.overdue.count > 0 || data.firstNegativeDate || budgetAlerts.length > 0;

  return (
    <Card className={`mb-6 ${isPlaceholderData ? 'opacity-70' : ''}`}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Projeção de saldo{accountName ? ` · ${accountName}` : ''}</CardTitle>
          <CardDescription>
            Considera transações pendentes e recorrências ativas, mesmo as que ainda não foram geradas.
          </CardDescription>
        </div>
        <div className="flex gap-1" role="group" aria-label="Período da projeção">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              size="sm"
              variant={days === r.days ? 'secondary' : 'ghost'}
              aria-pressed={days === r.days}
              onClick={() => setDays(r.days)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">Saldo hoje (pago)</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatCents(data.realizedBalanceCents)}</dd>
            {data.projectedTodayCents !== data.realizedBalanceCents && (
              <dd className="text-xs text-muted-foreground">
                {formatCents(data.projectedTodayCents)} contando as atrasadas
              </dd>
            )}
          </div>
          <div className="rounded-md bg-muted/60 p-3">
            <dt className="text-xs text-muted-foreground">Previsto em {formatDate(endDate)}</dt>
            <dd className={`text-xl font-semibold tabular-nums ${data.endBalanceCents < 0 ? 'text-red-600' : ''}`}>
              {formatCents(data.endBalanceCents)}
            </dd>
          </div>
          <div className="rounded-md bg-muted/60 p-3">
            <dt className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" aria-hidden /> Menor saldo previsto
            </dt>
            <dd className={`text-xl font-semibold tabular-nums ${data.lowest.balanceCents < 0 ? 'text-red-600' : ''}`}>
              {formatCents(data.lowest.balanceCents)}
            </dd>
            <dd className="text-xs text-muted-foreground">em {formatDate(data.lowest.date)}</dd>
          </div>
        </dl>

        {hasAlerts && (
          <ul className="space-y-2" aria-label="Alertas">
            {data.firstNegativeDate && (
              <Alert severity="critical">
                Seu saldo previsto fica <strong>negativo em {formatDate(data.firstNegativeDate)}</strong>.
              </Alert>
            )}
            {data.overdue.count > 0 && (
              <Alert
                severity="critical"
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!overdue.data || setStatus.isPending}
                    onClick={() => pay(overdue.data!.map((t) => t.id), `${overdue.data!.length} transação(ões) marcada(s) como paga(s).`)}
                  >
                    Marcar todas como pagas
                  </Button>
                }
              >
                {data.overdue.count} transação(ões) atrasada(s)
                {data.overdue.expenseCents > 0 && ` · ${formatCents(data.overdue.expenseCents)} a pagar`}
                {data.overdue.incomeCents > 0 && ` · ${formatCents(data.overdue.incomeCents)} a receber`}
              </Alert>
            )}
            {budgetAlerts.map((b) => (
              <Alert key={b.categoryId} severity={b.level === 'exceeded' ? 'critical' : 'warning'}>
                {b.category.icon} {b.category.name}: {b.percent}% do limite de {formatCents(b.amountCents)}
                {b.level === 'exceeded' ? ` (estourou ${formatCents(-b.remainingCents)})` : ` (restam ${formatCents(b.remainingCents)})`}
                {b.pendingCents > 0 && `, contando ${formatCents(b.pendingCents)} previstos`}
              </Alert>
            ))}
          </ul>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <AreaChart data={data.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="projection-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`}
                  tick={{ fontSize: 11 }}
                  minTickGap={32}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCentsShort(v, false)}
                  tick={{ fontSize: 11 }}
                  width={64}
                  tickLine={false}
                  axisLine={false}
                />
                <ReferenceLine
                  y={0}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  label={{ value: 'R$ 0', position: 'insideTopLeft', fontSize: 10, fill: 'var(--muted-foreground)' }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }} />
                <Area
                  type="stepAfter"
                  dataKey="balanceCents"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#projection-fill)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium">Próximos 7 dias</h3>
            {data.upcoming.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">Nada pendente nos próximos dias.</p>
            ) : (
              <ul className="max-h-56 divide-y overflow-y-auto pr-1">
                {data.upcoming.map((item) => (
                  <UpcomingRow
                    key={item.id ?? `${item.recurringId}-${item.date}`}
                    item={item}
                    today={data.today}
                    paying={setStatus.isPending}
                    onPay={() => pay([item.id!], `${item.description} marcado como ${item.type === 'income' ? 'recebido' : 'pago'}.`)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
