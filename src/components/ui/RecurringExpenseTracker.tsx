'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { MonthlyData } from '@/types/finance';
import { Wallet,  CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type RecurringExpenseTrackerProps = {
  data: MonthlyData;
  onUpdateProjections?: (projectedExpenses: { date: Date, amount: number }[]) => void;
};

export default function RecurringExpenseTracker({ data, onUpdateProjections }: RecurringExpenseTrackerProps) {
  const [monthlyEstimate, setMonthlyEstimate] = useState<number>(0)
  const [dailyAmount, setDailyAmount] = useState<number>(0);
  const [savedDays, setSavedDays] = useState<number[]>([]);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [showProjection, setShowProjection] = useState<boolean>(false);
  const daysInMonth = new Date(data.year, data.month + 1, 0).getDate();
  const currentDay = new Date().getDate();

  useEffect(() => {
    try {
      const savedEstimate = localStorage.getItem(`recurring-estimate-${data.month}-${data.year}`);
      const savedDaysList = localStorage.getItem(`saved-days-${data.month}-${data.year}`);
      const savedStatus = localStorage.getItem(`recurring-status-${data.month}-${data.year}`);
      
      if (savedEstimate) setMonthlyEstimate(parseFloat(savedEstimate));
      if (savedDaysList) setSavedDays(JSON.parse(savedDaysList));
      if (savedStatus) setIsEnabled(savedStatus === 'true');
    } catch (error) {
      console.error('Erro ao carregar dados de gastos recorrentes:', error);
    }
  }, [data.month, data.year]);

  useEffect(() => {
    try {
      localStorage.setItem(`recurring-estimate-${data.month}-${data.year}`, monthlyEstimate.toString());
      localStorage.setItem(`saved-days-${data.month}-${data.year}`, JSON.stringify(savedDays));
      localStorage.setItem(`recurring-status-${data.month}-${data.year}`, isEnabled.toString());
    } catch (error) {
      console.error('Erro ao salvar dados de gastos recorrentes:', error);
    }
  }, [monthlyEstimate, savedDays, isEnabled, data.month, data.year]);
  
  useEffect(() => {
    if (monthlyEstimate > 0 && daysInMonth > 0) {
      const perDay = monthlyEstimate / daysInMonth;
      setDailyAmount(perDay);
      
      if (onUpdateProjections && isEnabled) {
        const projections = [];
        for (let day = 1; day <= daysInMonth; day++) {
          if (day < currentDay && savedDays.includes(day)) continue;

          if (day < currentDay && !savedDays.includes(day)) continue;
          
          if (day >= currentDay) {
            projections.push({
              date: new Date(data.year, data.month, day),
              amount: perDay
            });
          }
        }
        onUpdateProjections(projections);
      }
    }
  }, [monthlyEstimate, daysInMonth, savedDays, isEnabled, currentDay, onUpdateProjections, data.year, data.month]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const toggleSavedDay = (day: number) => {
    if (savedDays.includes(day)) {
      setSavedDays(savedDays.filter(d => d !== day));
    } else {
      setSavedDays([...savedDays, day]);
    }
  };
  const savedAmount = savedDays.length * dailyAmount;

  const passedDays = Math.min(currentDay, daysInMonth);
  
  const remainingDays = daysInMonth - passedDays;

  const spentAmount = (passedDays - savedDays.filter(d => d <= currentDay).length) * dailyAmount;

  const projectedRemainingAmount = remainingDays * dailyAmount;
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Controle de Gastos Recorrentes
        </CardTitle>
        <CardDescription>
          Distribua seus gastos recorrentes não fixos ao longo do mês para melhor controle financeiro.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Configuração do valor mensal */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <Label htmlFor="monthlyEstimate" className="text-lg">Estimativa mensal de gastos recorrentes:</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="monthlyEstimate"
                  type="number"
                  min="0"
                  step="10"
                  value={monthlyEstimate}
                  onChange={(e) => setMonthlyEstimate(parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
                <Button
                  variant={isEnabled ? "destructive" : "default"}
                  onClick={() => setIsEnabled(!isEnabled)}
                >
                  {isEnabled ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </div>
            
            {isEnabled && (
              <>
                <div className="bg-muted p-4 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor diário</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(dailyAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Você economizou</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(savedAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dias economizados</p>
                      <p className="text-2xl font-bold text-primary">{savedDays.length} de {passedDays}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mb-2">
                  <h3 className="font-medium">Acompanhamento de gastos</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowProjection(!showProjection)}
                  >
                    {showProjection ? 'Ocultar projeção' : 'Ver projeção'}
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Dias passados</h4>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: passedDays }).map((_, i) => {
                        const day = i + 1;
                        const isSaved = savedDays.includes(day);
                        
                        return (
                          <Button
                            key={`day-${day}`}
                            variant={isSaved ? "default" : "outline"}
                            size="sm"
                            className={`h-12 ${isSaved ? 'bg-green-100 hover:bg-green-200 text-green-800' : ''}`}
                            onClick={() => toggleSavedDay(day)}
                          >
                            <div className="flex flex-col items-center">
                              <span>{day}</span>
                              {isSaved && <CheckCircle className="h-4 w-4 text-green-600" />}
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Clique nos dias em que você não gastou o valor previsto.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Resumo financeiro</h4>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Gasto até agora</TableCell>
                          <TableCell className="text-right">{formatCurrency(spentAmount)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Economia</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(savedAmount)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Projeção para dias restantes</TableCell>
                          <TableCell className="text-right">{formatCurrency(projectedRemainingAmount)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Total projetado no mês</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(spentAmount + projectedRemainingAmount)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
                
                {showProjection && (
                  <div>
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
                        {Array.from({ length: Math.min(7, remainingDays) }).map((_, i) => {
                          const day = currentDay + i;
                          const date = new Date(data.year, data.month, day);
                          const formattedDate = new Intl.DateTimeFormat('pt-BR').format(date);
                          
                          return (
                            <TableRow key={`projection-${day}`}>
                              <TableCell>{formattedDate}</TableCell>
                              <TableCell>{formatCurrency(dailyAmount)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="">Projetado</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {remainingDays === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4">
                              Não há dias restantes neste mês.
                            </TableCell>
                          </TableRow>
                        )}
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
        </div>
      </CardContent>
    </Card>
  );
}