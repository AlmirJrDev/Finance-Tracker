'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTHS } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';

interface MonthSelectorProps {
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
}

export function MonthSelector({ 
  currentMonth, 
  currentYear, 
  onMonthChange 
}: MonthSelectorProps) {
  // Criar uma lista de todos os meses para 2025 e 2026
  const allMonths: { month: number, year: number, label: string, value: string }[] = [];
  
  // Adicionar todos os meses de 2025
  for (let month = 0; month < 12; month++) {
    allMonths.push({
      month,
      year: 2025,
      label: `${MONTHS[month]} 2025`,
      value: `2025-${month}`
    });
  }
  
  // Adicionar todos os meses de 2026
  for (let month = 0; month < 12; month++) {
    allMonths.push({
      month,
      year: 2026,
      label: `${MONTHS[month]} 2026`,
      value: `2026-${month}`
    });
  }

  return (
    <Card className="w-full mb-4">
      <CardContent className="pt-4">
        <Select 
          value={`${currentYear}-${currentMonth}`}
          onValueChange={(value) => {
            const [year, month] = value.split('-').map(Number);
            onMonthChange(month, year);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o mês" />
          </SelectTrigger>
          <SelectContent>
            {allMonths.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}