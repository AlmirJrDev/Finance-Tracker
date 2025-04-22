'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { MonthlyData } from '@/types/finance';
import { Calendar, PiggyBank, } from 'lucide-react';

type DailyAllowanceProps = {
  data: MonthlyData;
};

export default function DailyAllowance({ data }: DailyAllowanceProps) {
  // Usar o valor de performance como base
  const performanceValue = data.performance || 0;
  
  // Valor que a pessoa quer disponibilizar para gastos discricionários
  // Inicialmente 100% do performance
  const [allowanceAmount, setAllowanceAmount] = useState<number>(performanceValue);
  
  // Valor do item que a pessoa deseja comprar
  const [targetItemValue, setTargetItemValue] = useState<number>(0);
  const [targetItemName, setTargetItemName] = useState<string>('');
  
  // Dados calculados
  const [dailyAllowance, setDailyAllowance] = useState<number>(0);
  const [daysToSave, setDaysToSave] = useState<number>(0);
  
  // Número de dias no mês selecionado
  const daysInMonth = new Date(data.year, data.month + 1, 0).getDate();
  
  // Atualizar o valor quando performance mudar
  useEffect(() => {
    setAllowanceAmount(performanceValue);
  }, [performanceValue]);
  
  // Calcular a mesada diária sempre que os valores principais mudarem
  useEffect(() => {
    if (allowanceAmount > 0 && daysInMonth > 0) {
      const dailyValue = allowanceAmount / daysInMonth;
      setDailyAllowance(dailyValue);
      
      if (targetItemValue > 0) {
        setDaysToSave(Math.ceil(targetItemValue / dailyValue));
      }
    }
  }, [allowanceAmount, daysInMonth, targetItemValue]);
  
  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Calcular a data futura com base no número de dias
  const getFutureDate = (days: number) => {
    const currentDate = new Date(data.year, data.month, new Date().getDate());
    const futureDate = new Date(currentDate);
    futureDate.setDate(currentDate.getDate() + days);
    
    return futureDate.toLocaleDateString('pt-BR');
  };
  
  // Calcular a porcentagem do valor de performance
  const allowancePercentage = performanceValue > 0 
    ? Math.round((allowanceAmount / performanceValue) * 100)
    : 0;
  
  return (
    <div className='flex gap-4'>
 <Card className="mb-6 flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Limite de Gasto diario.
        </CardTitle>
        <CardDescription>
          Limite de Gasto diario é a divisão da sua performance ao longo do mês. 
        </CardDescription>
      </CardHeader>
      <CardContent>

          {/* Coluna 1: Definição do valor disponível */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quanto da sua performance você quer disponibilizar para gastos livres?</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(parseFloat(e.target.value) || 0)}
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground flex items-center whitespace-nowrap">
                  {allowancePercentage}% da performance
                </span>
              </div>
              
              <Slider
                value={[allowancePercentage]}
                min={0}
                max={100}
                step={5}
                className="py-4"
                onValueChange={(values) => {
                  if (performanceValue > 0) {
                    const percentage = values[0];
                    setAllowanceAmount((performanceValue * percentage) / 100);
                  }
                }}
              />
            </div>
            
            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-medium mb-2">Seu limite diário:</h3>
              <div className="text-3xl font-bold text-blue-600">
                {formatCurrency(dailyAllowance)}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  /dia
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Baseado em {daysInMonth} dias em {data.month} de {data.year}
              </p>
            </div>
          </div>
          
      
  
      </CardContent>
    </Card>
    <Card className="mb-6 flex-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Planejador de Gastos Futuros (Baseado no limite Diario)
        </CardTitle>
      </CardHeader>
      <CardContent>
      
         <div className="space-y-4">
            <div className="space-y-2">
              <Label>O que você deseja comprar?</Label>
              <Input
                placeholder="Nome do item (opcional)"
                value={targetItemName}
                onChange={(e) => setTargetItemName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Qual o valor?</Label>
              <Input
                type="number"
                min="0"
                step="10"
                value={targetItemValue}
                onChange={(e) => setTargetItemValue(parseFloat(e.target.value) || 0)}
              />
            </div>
            
            {targetItemValue > 0 && (
              <div className="bg-muted p-4 rounded-md space-y-2">
                <h3 className="font-medium">Simulação de economia:</h3>
                <p>
                  Para comprar {targetItemName ? targetItemName : "este item"} de {formatCurrency(targetItemValue)}, 
                  você precisará economizar por:
                </p>
                <div className="flex items-center gap-2 text-primary">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xl font-bold">{daysToSave} dias</span>
                </div>
                {daysToSave > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Previsão de compra: {getFutureDate(daysToSave)}
                  </p>
                )}
                
                {daysToSave > daysInMonth && (
                  <div className="text-amber-600 text-sm mt-2">
                    <p>
                      Atenção: Esta compra ultrapassa o mês atual e levará {Math.floor(daysToSave / 30)} {Math.floor(daysToSave / 30) === 1 ? 'mês ' : 'meses '}  
                      e {daysToSave % 30} {(daysToSave % 30) === 1 ? 'dia' : 'dias'} para ser realizada.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          
      
   
      </CardContent>
    </Card>

      
    </div>
   
  );
}