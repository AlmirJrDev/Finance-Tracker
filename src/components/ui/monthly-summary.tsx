import { MonthlyData } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MONTHS } from '@/lib/data';

interface MonthlySummaryProps {
  data: MonthlyData;
  allMonthsData?: MonthlyData[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function findPreviousMonth(data: MonthlyData[], month: number, year: number): MonthlyData | undefined {
  let prevMonth = month - 1;
  let prevYear = year;
  
  if (prevMonth < 0) {
    prevMonth = 11; 
    prevYear -= 1;
  }
  
  return data?.find(m => m.month === prevMonth && m.year === prevYear);
}

export function MonthlySummary({ data, allMonthsData = [] }: MonthlySummaryProps) {
  
  const previousMonth = findPreviousMonth(allMonthsData, data.month, data.year);

  const currentBalance = (data.initialBalance || 0) + data.performance;
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
          <CardTitle className="text-sm sm:text-base">Saldo Inicial</CardTitle>
          {previousMonth && (
            <CardDescription className="text-xs">
              Transferido de {MONTHS[previousMonth.month]} {previousMonth.year}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent  className="p-3 sm:p-6 pt-0">
          <div className={`text-lg sm:text-2xl font-bold truncate ${(data.initialBalance || 0) < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {formatCurrency(data.initialBalance || 0)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
          <CardTitle className="text-sm sm:text-base">Receitas</CardTitle>
        </CardHeader>
        <CardContent  className="p-3 sm:p-6 pt-0">
          <div className="text-lg sm:text-2xl font-bold truncate text-green-500">
            {formatCurrency(data.totalIncome || 0)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
          <CardTitle className="text-sm sm:text-base">Despesas</CardTitle>
        </CardHeader>
        <CardContent  className="p-3 sm:p-6 pt-0">
          <div className="text-lg sm:text-2xl font-bold truncate text-red-500">
            {formatCurrency(data.totalExpense || 0)}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-1 sm:pb-2">
          <CardTitle className="text-sm sm:text-base">Saldo Final</CardTitle>
          <CardDescription className="text-xs">
            Resultado do período
          </CardDescription>
        </CardHeader>
        <CardContent  className="p-3 sm:p-6 pt-0">
          <div className={`text-lg sm:text-2xl font-bold truncate ${currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
            {formatCurrency(currentBalance)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}