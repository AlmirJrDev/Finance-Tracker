'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useYearSummary } from '@/hooks/use-finance';
import { firstWeekday, formatDate, MONTHS } from '@/lib/dates';
import { formatCents, formatCentsShort } from '@/lib/money';
import type { DaySummary, MonthTotals } from '@/types/finance';

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

type Tooltip = { x: number; y: number; day: DaySummary } | null;

// Cor pelo resultado do dia (entradas − saídas), relativa ao maior valor do mês
function dayClass(day: DaySummary, maxIncome: number, maxExpense: number): string {
  if (day.transactionCount === 0) return 'day-empty-data';
  const net = day.incomeCents - day.expenseCents;
  if (net > 0) return net >= maxIncome * 0.5 ? 'day-pos-strong' : 'day-pos-soft';
  if (net < 0) return -net >= maxExpense * 0.5 ? 'day-neg-strong' : 'day-neg-soft';
  return 'day-neutral';
}

function MonthCard({
  data,
  onHover,
  onLeave,
  onSelect,
}: {
  data: MonthTotals;
  onHover: (e: React.MouseEvent, day: DaySummary) => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const nets = data.days.map((d) => d.incomeCents - d.expenseCents);
  const maxIncome = Math.max(1, ...nets);
  const maxExpense = Math.max(1, ...nets.map((n) => -n));
  const monthIndex = Number(data.month.slice(5, 7)) - 1;

  return (
    <div className="month-card">
      <button type="button" className="month-header" onClick={onSelect} title="Abrir mês">
        <span className="month-name">{MONTHS[monthIndex]}</span>
        <div className="month-stats">
          <span style={{ color: '#3B6D11' }}>{formatCentsShort(data.incomeCents)}</span>
          <span style={{ color: '#A32D2D' }}>{formatCentsShort(-data.expenseCents)}</span>
          <span style={{ color: data.resultCents >= 0 ? '#3B6D11' : '#A32D2D', fontWeight: 500 }}>
            {formatCentsShort(data.resultCents)}
          </span>
        </div>
      </button>

      <div className="weekday-row">
        {WEEKDAY_INITIALS.map((wd, i) => (
          <span key={i} className="weekday-label">
            {wd}
          </span>
        ))}
      </div>

      <div className="days-grid">
        {Array.from({ length: firstWeekday(data.month) }, (_, i) => (
          <div key={`empty-${i}`} className="day-placeholder" />
        ))}
        {data.days.map((day) => (
          <div
            key={day.date}
            className={`day-cell ${dayClass(day, maxIncome, maxExpense)}`}
            onMouseEnter={(e) => onHover(e, day)}
            onMouseLeave={onLeave}
          >
            {Number(day.date.slice(8, 10))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnnualView({
  initialYear,
  onSelectMonth,
  accountId,
}: {
  initialYear: number;
  onSelectMonth: (month: string) => void;
  accountId?: string;
}) {
  const [year, setYear] = useState(initialYear);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const { data, isLoading, isPlaceholderData, error } = useYearSummary(year, accountId);

  return (
    <>
      <style>{`
        .annual-wrap { font-family: var(--font-sans, sans-serif); }
        .annual-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px; }
        .year-nav { display: flex; align-items: center; gap: 8px; }
        .year-label { font-size: 20px; font-weight: 500; min-width: 56px; text-align: center; }
        .totals-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 1.25rem; }
        @media (max-width: 700px) { .totals-row { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .total-card { background: var(--muted); border-radius: 8px; padding: 10px 14px; }
        .total-label { font-size: 11px; color: var(--muted-foreground); margin-bottom: 2px; }
        .total-value { font-size: 17px; font-weight: 500; }
        .months-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 900px) { .months-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 600px) { .months-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .month-card { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--card); }
        .month-header { display: block; width: 100%; text-align: left; padding: 7px 9px 5px; border-bottom: 1px solid var(--border); cursor: pointer; }
        .month-header:hover { background: var(--muted); }
        .month-name { font-size: 12px; font-weight: 500; display: block; margin-bottom: 3px; }
        .month-stats { display: flex; gap: 6px; flex-wrap: wrap; }
        .month-stats span { font-size: 10px; }
        .weekday-row { display: grid; grid-template-columns: repeat(7, 1fr); padding: 3px 5px 1px; }
        .weekday-label { font-size: 8px; text-align: center; color: var(--muted-foreground); opacity: 0.6; }
        .days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1.5px; padding: 3px 5px 5px; }
        .day-placeholder { aspect-ratio: 1; }
        .day-cell { aspect-ratio: 1; border-radius: 2px; font-size: 8px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: default; transition: transform 0.08s; }
        .day-cell:hover { transform: scale(1.4); z-index: 10; position: relative; }
        .day-empty-data { background: var(--muted); color: var(--muted-foreground); opacity: 0.5; }
        .day-pos-strong { background: #8ac03f; color: #27500A; }
        .day-pos-soft { background: #bcd996; color: #3B6D11; }
        .day-neg-strong { background: #d81c1c; color: #fff; }
        .day-neg-soft { background: #ef9696; color: #7a1f1f; }
        .day-neutral { background: var(--muted); color: var(--muted-foreground); }
        .legend { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--muted-foreground); }
        .legend-dot { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
        .ann-tooltip { position: fixed; z-index: 9999; pointer-events: none; background: var(--popover); color: var(--popover-foreground); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 12px; min-width: 160px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .tt-date { font-weight: 500; font-size: 11px; margin-bottom: 5px; }
        .tt-row { display: flex; justify-content: space-between; gap: 14px; font-size: 11px; color: var(--muted-foreground); padding: 1px 0; }
        .tt-pos { color: #3B6D11; font-weight: 500; }
        .tt-neg { color: #A32D2D; font-weight: 500; }
      `}</style>

      <div className="annual-wrap">
        {tooltip && (
          <div className="ann-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}>
            <div className="tt-date">{formatDate(tooltip.day.date)}</div>
            {tooltip.day.incomeCents > 0 && (
              <div className="tt-row">
                <span>Entradas</span>
                <span className="tt-pos">+{formatCents(tooltip.day.incomeCents)}</span>
              </div>
            )}
            {tooltip.day.expenseCents > 0 && (
              <div className="tt-row">
                <span>Saídas</span>
                <span className="tt-neg">-{formatCents(tooltip.day.expenseCents)}</span>
              </div>
            )}
            <div className="tt-row" style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
              <span>Saldo acumulado</span>
              <span className={tooltip.day.balanceCents >= 0 ? 'tt-pos' : 'tt-neg'}>{formatCents(tooltip.day.balanceCents)}</span>
            </div>
          </div>
        )}

        <div className="annual-header">
          <div className="year-nav">
            <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="year-label">{year}</span>
            <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: '#8ac03f' }} />Entrou bem mais</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#bcd996' }} />Entrou mais</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#ef9696' }} />Saiu mais</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#d81c1c' }} />Saiu bem mais</div>
          </div>
        </div>

        {error ? (
          <p className="py-10 text-center text-muted-foreground">Não foi possível carregar {year}: {error.message}</p>
        ) : isLoading || !data ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <div className={isPlaceholderData ? 'opacity-60' : ''}>
            <div className="totals-row">
              <div className="total-card">
                <div className="total-label">Entradas no ano</div>
                <div className="total-value" style={{ color: '#3B6D11' }}>{formatCents(data.incomeCents)}</div>
              </div>
              <div className="total-card">
                <div className="total-label">Saídas no ano</div>
                <div className="total-value" style={{ color: '#A32D2D' }}>{formatCents(data.expenseCents)}</div>
              </div>
              <div className="total-card">
                <div className="total-label">Resultado anual</div>
                <div className="total-value" style={{ color: data.resultCents >= 0 ? '#3B6D11' : '#A32D2D' }}>
                  {data.resultCents >= 0 ? '+' : ''}
                  {formatCents(data.resultCents)}
                </div>
              </div>
              <div className="total-card">
                <div className="total-label">Saldo em 31/12</div>
                <div className="total-value" style={{ color: data.finalBalanceCents >= 0 ? '#3B6D11' : '#A32D2D' }}>
                  {formatCents(data.finalBalanceCents)}
                </div>
              </div>
            </div>

            <div className="months-grid">
              {data.months.map((m) => (
                <MonthCard
                  key={m.month}
                  data={m}
                  onHover={(e, day) => setTooltip({ x: e.clientX, y: e.clientY, day })}
                  onLeave={() => setTooltip(null)}
                  onSelect={() => onSelectMonth(m.month)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
