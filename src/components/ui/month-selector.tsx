'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addMonths, currentMonthStr, monthLabel } from '@/lib/dates';
import type { ActiveMonth } from '@/types/finance';

type Props = {
  month: string;
  onChange: (month: string) => void;
  activeMonths: ActiveMonth[];
};

export function MonthSelector({ month, onChange, activeMonths }: Props) {
  // Do mês mais antigo com dados (ou 12 meses atrás) até 12 meses à frente
  const current = currentMonthStr();
  const oldest = activeMonths.at(-1)?.month;
  let start = addMonths(current, -12);
  if (oldest && oldest < start) start = oldest;
  if (month < start) start = month;
  let end = addMonths(current, 12);
  if (month > end) end = month;

  const withData = new Map(activeMonths.map((m) => [m.month, m.transactionCount]));
  const options: string[] = [];
  for (let m = end; m >= start; m = addMonths(m, -1)) options.push(m);

  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" onClick={() => onChange(addMonths(month, -1))} aria-label="Mês anterior">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Select value={month} onValueChange={onChange}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Selecione o mês" />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          {options.map((m) => (
            <SelectItem key={m} value={m}>
              <span className="flex w-full items-center justify-between gap-3">
                <span>
                  {monthLabel(m)}
                  {m === current ? ' (atual)' : ''}
                </span>
                {withData.has(m) && <span className="text-xs text-muted-foreground">{withData.get(m)}</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={() => onChange(addMonths(month, 1))} aria-label="Próximo mês">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
