'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { currentMonthStr, daysInMonth, formatDate, parseMonth, todayStr } from '@/lib/dates';
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money';

// Ferramenta de acompanhamento pessoal; os dados ficam no navegador.
// As chaves mantêm o formato antigo (mês 0-11) para preservar o que já foi salvo.
function storageKeys(month: string) {
  const { year, month: m } = parseMonth(month);
  const suffix = `${m - 1}-${year}`;
  return {
    estimate: `recurring-estimate-${suffix}`,
    savedDays: `saved-days-${suffix}`,
    enabled: `recurring-status-${suffix}`,
  };
}

function read<T>(key: string, fallback: T, parse: (v: string) => T): T {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : parse(value);
  } catch {
    return fallback;
  }
}

/** O dashboard remonta este componente a cada mês (key), então o estado inicial vem do armazenamento. */
export default function RecurringExpenseTracker({ month }: { month: string }) {
  const keys = storageKeys(month);
  const [estimate, setEstimate] = useState(() => {
    const reais = read(keys.estimate, 0, Number);
    return reais > 0 ? centsToInput(Math.round(reais * 100)) : '';
  });
  const [savedDays, setSavedDays] = useState<number[]>(() => read(keys.savedDays, [], JSON.parse));
  const [enabled, setEnabled] = useState(() => read(keys.enabled, false, (v) => v === 'true'));
  const [showProjection, setShowProjection] = useState(false);

  const estimateCents = parseAmountToCents(estimate) ?? 0;

  useEffect(() => {
    try {
      localStorage.setItem(keys.estimate, String(estimateCents / 100));
      localStorage.setItem(keys.savedDays, JSON.stringify(savedDays));
      localStorage.setItem(keys.enabled, String(enabled));
    } catch {
      /* armazenamento indisponível */
    }
  }, [estimateCents, savedDays, enabled, keys.estimate, keys.savedDays, keys.enabled]);

  const total = daysInMonth(month);
  const current = currentMonthStr();
  // Mês passado: todos os dias já passaram; mês futuro: nenhum
  const passedDays = month < current ? total : month > current ? 0 : Number(todayStr().slice(8, 10));
  const remainingDays = total - passedDays;
  const dailyCents = total > 0 ? Math.floor(estimateCents / total) : 0;

  const savedCount = savedDays.filter((d) => d <= passedDays).length;
  const savedCents = savedCount * dailyCents;
  const spentCents = (passedDays - savedCount) * dailyCents;
  const projectedCents = remainingDays * dailyCents;

  const toggleDay = (day: number) =>
    setSavedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Controle de Gastos Variáveis
        </CardTitle>
        <CardDescription>
          Distribua um gasto que se repete mas não é fixo (almoço, transporte) ao longo do mês e marque os dias em que
          não gastou.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <Label htmlFor="monthlyEstimate" className="text-base font-medium">
              Estimativa mensal:
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="monthlyEstimate"
                inputMode="decimal"
                placeholder="0,00"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                className="w-28 sm:w-32"
              />
              <Button variant={enabled ? 'destructive' : 'default'} onClick={() => setEnabled(!enabled)}>
                {enabled ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </div>

          {enabled && (
            <>
              <div className="bg-muted p-4 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Valor diário</p>
                    <p className="text-2xl font-bold text-primary">{formatCents(dailyCents)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Você economizou</p>
                    <p className="text-2xl font-bold text-green-600">{formatCents(savedCents)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dias economizados</p>
                    <p className="text-2xl font-bold text-primary">
                      {savedCount} de {passedDays}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mb-2">
                <h3 className="font-medium">Acompanhamento de gastos</h3>
                {remainingDays > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowProjection(!showProjection)}>
                    {showProjection ? 'Ocultar projeção' : 'Ver projeção'}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Dias passados</h4>
                  {passedDays === 0 ? (
                    <p className="text-sm text-muted-foreground">Este mês ainda não começou.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: passedDays }, (_, i) => i + 1).map((day) => {
                          const isSaved = savedDays.includes(day);
                          return (
                            <Button
                              key={day}
                              variant={isSaved ? 'default' : 'outline'}
                              size="sm"
                              aria-pressed={isSaved}
                              className={`h-10 w-full p-0 text-xs ${isSaved ? 'bg-green-100 hover:bg-green-200 text-green-800' : ''}`}
                              onClick={() => toggleDay(day)}
                            >
                              <div className="flex flex-col items-center gap-0">
                                <span className="text-xs">{day}</span>
                                {isSaved && <CheckCircle className="h-3 w-3 text-green-600" />}
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Clique nos dias em que você não gastou o valor previsto.
                      </p>
                    </>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <h4 className="text-sm font-medium mb-2">Resumo financeiro</h4>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Gasto até agora</TableCell>
                        <TableCell className="text-right">{formatCents(spentCents)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Economia</TableCell>
                        <TableCell className="text-right text-green-600">{formatCents(savedCents)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Projeção para dias restantes</TableCell>
                        <TableCell className="text-right">{formatCents(projectedCents)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total projetado no mês</TableCell>
                        <TableCell className="text-right font-bold">{formatCents(spentCents + projectedCents)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {showProjection && remainingDays > 0 && (
                <div className="overflow-x-auto">
                  <h4 className="text-sm font-medium mb-2">Projeção para os próximos dias</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: Math.min(7, remainingDays) }, (_, i) => passedDays + i + 1).map((day) => (
                        <TableRow key={day}>
                          <TableCell>{formatDate(`${month}-${String(day).padStart(2, '0')}`)}</TableCell>
                          <TableCell>{formatCents(dailyCents)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Projetado</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {remainingDays > 7 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Mostrando os próximos 7 dias de {remainingDays} restantes.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
