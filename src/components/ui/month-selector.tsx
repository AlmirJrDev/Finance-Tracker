'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MONTHS } from '@/lib/data';
import { Card, CardContent } from '@/components/ui/card';

interface MonthSelectorProps {
  availableMonths: { month: number, year: number }[];
  currentMonth: number;
  currentYear: number;
  onMonthChange: (month: number, year: number) => void;
}

export function MonthSelector({ 
  availableMonths, 
  currentMonth, 
  currentYear, 
  onMonthChange 
}: MonthSelectorProps) {
  const monthOptions = availableMonths.map(({ month, year }) => ({
    value: `${year}-${month}`,
    label: `${MONTHS[month]} ${year}`
  }));

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
            {monthOptions.map((option) => (
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