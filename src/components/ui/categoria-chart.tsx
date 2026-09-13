'use client';

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useMonthSummary } from '@/hooks/use-finance';
import { addMonths, monthLabel } from '@/lib/dates';
import { formatCents, formatCentsShort } from '@/lib/money';
import type { MonthSummary } from '@/types/finance';

export default function CategoryCharts({ summary }: { summary: MonthSummary }) {
  const previousMonth = addMonths(summary.month, -1);
  const previous = useMonthSummary(previousMonth);

  const data = summary.byCategory
    .filter((c) => c.expenseCents > 0)
    .map((c) => ({
      name: c.icon ? `${c.icon} ${c.name}` : c.name,
      value: c.expenseCents / 100,
      fill: c.color,
    }));

  const chartConfig: ChartConfig = Object.fromEntries(data.map((d) => [d.name, { label: d.name, color: d.fill }]));

  // Variação real das despesas em relação ao mês anterior
  const prevExpense = previous.data?.expenseCents ?? 0;
  const change = prevExpense > 0 ? ((summary.expenseCents - prevExpense) / prevExpense) * 100 : null;

  return (
    <Card className="w-full mb-6 bg-card">
      <CardHeader className="pb-2">
        <CardTitle>Gastos por Categoria</CardTitle>
        <CardDescription>Despesas de {monthLabel(summary.month)}</CardDescription>
      </CardHeader>

      <CardContent
        className={`flex w-full p-2 gap-4 justify-between flex-col items-center xl:flex-row ${data.length > 0 ? 'xl:divide-x' : ''}`}
      >
        {data.length > 0 ? (
          <>
            <ChartContainer config={chartConfig} className="h-64 2xl:h-80 w-full xl:flex-1">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="45%">
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Legend layout="horizontal" align="center" verticalAlign="bottom" />
              </PieChart>
            </ChartContainer>

            <ChartContainer config={chartConfig} className="h-64 2xl:h-80 w-full xl:flex-1">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(value: number) => formatCentsShort(value * 100, false)}
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar radius={8} dataKey="value">
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </>
        ) : (
          <div className="py-8 text-muted-foreground">Nenhum gasto registrado neste período</div>
        )}
      </CardContent>

      <CardFooter className="flex-col items-start gap-2 text-sm">
        {change !== null && (
          <div className="flex gap-2 font-medium leading-none">
            {Math.abs(change) < 0.5 ? (
              <>
                <span className="text-muted-foreground">Despesas estáveis em relação a {monthLabel(previousMonth)}</span>
                <Minus className="h-4 w-4 text-muted-foreground" />
              </>
            ) : change > 0 ? (
              <>
                <span className="text-red-500">
                  Despesas {change.toFixed(1).replace('.', ',')}% maiores que em {monthLabel(previousMonth)}
                </span>
                <TrendingUp className="h-4 w-4 text-red-500" />
              </>
            ) : (
              <>
                <span className="text-green-500">
                  Despesas {Math.abs(change).toFixed(1).replace('.', ',')}% menores que em {monthLabel(previousMonth)}
                </span>
                <TrendingDown className="h-4 w-4 text-green-500" />
              </>
            )}
          </div>
        )}
        <div className="leading-none text-muted-foreground">
          {data.length > 0
            ? `${data.length} categoria(s) · total de ${formatCents(summary.expenseCents)}`
            : 'Adicione transações para ver a análise de categorias'}
        </div>
      </CardFooter>
    </Card>
  );
}
