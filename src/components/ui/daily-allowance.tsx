'use client';

import { useState } from 'react';
import { Calendar, PiggyBank } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { daysInMonth, formatDate, monthLabel } from '@/lib/dates';
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money';
import type { MonthSummary } from '@/types/finance';

function addDaysToToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
}

export default function DailyAllowance({ summary }: { summary: MonthSummary }) {
  const resultCents = Math.max(summary.resultCents, 0);
  const days = daysInMonth(summary.month);

  // O dashboard remonta este componente (key) quando o resultado do mês muda
  const [allowance, setAllowance] = useState(() => centsToInput(resultCents));
  const [targetName, setTargetName] = useState('');
  const [target, setTarget] = useState('');

  const allowanceCents = parseAmountToCents(allowance) ?? 0;
  const dailyCents = Math.floor(allowanceCents / days);
  const targetCents = parseAmountToCents(target) ?? 0;
  const daysToSave = dailyCents > 0 && targetCents > 0 ? Math.ceil(targetCents / dailyCents) : 0;
  const percentage = resultCents > 0 ? Math.round((allowanceCents / resultCents) * 100) : 0;

  return (
    <div className="flex gap-4 flex-col md:flex-row">
      <Card className="mb-6 flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Limite de Gasto Diário
          </CardTitle>
          <CardDescription>Divide o resultado do mês (receitas − despesas) pelos dias do mês.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allowance">Quanto do resultado você quer liberar para gastos livres?</Label>
              <div className="flex gap-2">
                <Input
                  id="allowance"
                  inputMode="decimal"
                  value={allowance}
                  onChange={(e) => setAllowance(e.target.value)}
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground flex items-center whitespace-nowrap">
                  {percentage}% do resultado
                </span>
              </div>

              <Slider
                value={[Math.min(percentage, 100)]}
                min={0}
                max={100}
                step={5}
                className="py-4"
                disabled={resultCents === 0}
                onValueChange={([value]) => setAllowance(centsToInput(Math.round((resultCents * value) / 100)))}
              />
              {resultCents === 0 && (
                <p className="text-xs text-muted-foreground">O mês ainda não tem resultado positivo.</p>
              )}
            </div>

            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-medium mb-2">Seu limite diário:</h3>
              <div className="text-3xl font-bold text-blue-600">
                {formatCents(dailyCents)}
                <span className="text-sm font-normal text-muted-foreground ml-1">/dia</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Baseado nos {days} dias de {monthLabel(summary.month)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 flex-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Planejador de Compras
          </CardTitle>
          <CardDescription>Quanto tempo guardando o limite diário até conseguir comprar algo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-name">O que você deseja comprar?</Label>
              <Input
                id="target-name"
                placeholder="Nome do item (opcional)"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-value">Qual o valor?</Label>
              <Input
                id="target-value"
                inputMode="decimal"
                placeholder="0,00"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>

            {targetCents > 0 && (
              <div className="bg-muted p-4 rounded-md space-y-2">
                <h3 className="font-medium">Simulação de economia:</h3>
                {daysToSave > 0 ? (
                  <>
                    <p>
                      Para comprar {targetName || 'este item'} de {formatCents(targetCents)}, você precisará economizar
                      por:
                    </p>
                    <div className="flex items-center gap-2 text-primary">
                      <Calendar className="h-5 w-5" />
                      <span className="text-xl font-bold">{daysToSave} dias</span>
                    </div>
                    <p className="text-sm text-muted-foreground">Previsão de compra: {addDaysToToday(daysToSave)}</p>
                    {daysToSave > days && (
                      <p className="text-amber-600 text-sm">
                        Leva cerca de {Math.floor(daysToSave / 30)} mês(es) e {daysToSave % 30} dia(s).
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Defina um limite diário maior que zero para simular.</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
