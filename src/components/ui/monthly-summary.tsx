import { MonthlyData } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MONTHS } from '@/lib/data';

interface MonthlySummaryProps {
  data: MonthlyData;
  allMonthsData?: MonthlyData[];
}

// Função auxiliar para formatar valores monetários
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Função para encontrar o mês anterior
function findPreviousMonth(data: MonthlyData[], month: number, year: number): MonthlyData | undefined {
  let prevMonth = month - 1;
  let prevYear = year;
  
  if (prevMonth < 0) {
    prevMonth = 11; // Dezembro
    prevYear -= 1;
  }
  
  return data?.find(m => m.month === prevMonth && m.year === prevYear);
}

export function MonthlySummary({ data, allMonthsData = [] }: MonthlySummaryProps) {
  // Encontrar o mês anterior (se existir)
  
  const previousMonth = findPreviousMonth(allMonthsData, data.month, data.year);
  
  // Calcular o saldo final (balanço atual = saldo inicial + performance)
  const currentBalance = (data.initialBalance || 0) + data.performance;
  
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>Saldo Inicial</CardTitle>
          {previousMonth && (
            <CardDescription>
              Transferido de {MONTHS[previousMonth.month]} {previousMonth.year}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${(data.initialBalance || 0) < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {formatCurrency(data.initialBalance || 0)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Receitas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {formatCurrency(data.totalIncome || 0)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-500">
            {formatCurrency(data.totalExpense || 0)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Saldo Final</CardTitle>
          <CardDescription>
            Resultado do período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {formatCurrency(currentBalance)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}