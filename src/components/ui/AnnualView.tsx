'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayData {
  day: number;
  income: number;
  expense: number;
  balance: number;
  hasTransactions: boolean;
}

interface MonthData {
  month: number; // 0-11
  year: number;
  totalIncome: number;
  totalExpense: number;
  performance: number;
  days: DayData[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  day: DayData | null;
  month: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  if (value.$numberDecimal) return parseFloat(value.$numberDecimal) || 0;
  return 0;
}

function fmt(value: number): string {
  const abs = Math.abs(value);
  return (value < 0 ? '-' : '') + 'R$ ' + abs.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '+';
  if (abs >= 1000) return sign + 'R$' + (abs / 1000).toFixed(1) + 'k';
  return sign + 'R$' + abs.toFixed(0);
}

function getDayColorClass(day: DayData, allBalances: number[]): string {
  if (!day.hasTransactions) return 'day-empty-data';
  const positives = allBalances.filter(b => b > 0);
  const negatives = allBalances.filter(b => b < 0);
  const maxPos = positives.length > 0 ? Math.max(...positives) : 1;
  const minNeg = negatives.length > 0 ? Math.min(...negatives) : -1;

  if (day.balance > 0) {
    return day.balance >= maxPos * 0.5 ? 'day-pos-strong' : 'day-pos-soft';
  } else if (day.balance < 0) {
    return day.balance <= minNeg * 0.5 ? 'day-neg-strong' : 'day-neg-soft';
  }
  return 'day-neutral';
}

// ─── API → MonthData ──────────────────────────────────────────────────────────

function buildMonthData(summary: any, transactions: any[], month: number, year: number): MonthData {
  const apiMonth = month + 1;
  const daysInMonth = new Date(year, apiMonth, 0).getDate();

  const byDay: Record<number, any[]> = {};
  for (const t of transactions) {
    const day = new Date(t.date).getUTCDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(t);
  }

  const initialBalance = toNumber(summary?.initialBalance);
  let running = initialBalance;

  const days: DayData[] = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dayTx = byDay[d] || [];
    const income = dayTx
      .filter((t: any) => t.type === 'entrada')
      .reduce((s: number, t: any) => s + toNumber(t.amount), 0);
    const expense = dayTx
      .filter((t: any) => t.type === 'saída')
      .reduce((s: number, t: any) => s + toNumber(t.amount), 0);
    running += income - expense;
    return {
      day: d,
      income,
      expense,
      balance: Math.round(running),
      hasTransactions: dayTx.length > 0,
    };
  });

  return {
    month,
    year,
    totalIncome: toNumber(summary?.totalIncome),
    totalExpense: toNumber(summary?.totalExpense),
    performance: toNumber(summary?.performance),
    days,
  };
}

// ─── Mini Month Calendar ──────────────────────────────────────────────────────

function MonthCard({
  data,
  onDayHover,
  onDayLeave,
}: {
  data: MonthData;
  onDayHover: (e: React.MouseEvent, day: DayData, month: number) => void;
  onDayLeave: () => void;
}) {
  const firstDay = new Date(data.year, data.month, 1).getDay();
  const allBalances = data.days.map(d => d.balance);
  const perfPositive = data.performance >= 0;

  return (
    <div className="month-card">
      <div className="month-header">
        <span className="month-name">{MONTHS_PT[data.month]}</span>
        <div className="month-stats">
          <span style={{ color: '#3B6D11' }}>{fmtShort(data.totalIncome)}</span>
          <span style={{ color: '#A32D2D' }}>-{fmtShort(data.totalExpense)}</span>
          <span style={{ color: perfPositive ? '#3B6D11' : '#A32D2D', fontWeight: 500 }}>
            {fmtShort(data.performance)}
          </span>
        </div>
      </div>

      <div className="weekday-row">
        {WEEKDAYS.map((wd, i) => (
          <span key={i} className="weekday-label">{wd}</span>
        ))}
      </div>

      <div className="days-grid">
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} className="day-placeholder" />
        ))}
        {data.days.map(day => (
          <div
            key={day.day}
            className={`day-cell ${getDayColorClass(day, allBalances)}`}
            onMouseEnter={e => onDayHover(e, day, data.month)}
            onMouseLeave={onDayLeave}
          >
            {day.day}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnnualView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthsData, setMonthsData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMonths, setLoadingMonths] = useState<Set<number>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, day: null, month: 0,
  });

  const loadYear = useCallback(async (y: number) => {
    setLoading(true);
    setMonthsData([]);

    // Carrega todos os meses em paralelo
    const promises = Array.from({ length: 12 }, (_, m) => {
      const apiMonth = m + 1;
      return Promise.all([
        api.getMonthlySummary(y, apiMonth).catch(() => ({ data: null })),
        api.getTransactionsByMonth(y, apiMonth).catch(() => ({ data: [] })),
      ]).then(([summaryRes, txRes]) =>
        buildMonthData(summaryRes.data, txRes.data, m, y)
      );
    });

    const results = await Promise.allSettled(promises);
    const loaded: MonthData[] = results
      .map((r, m) =>
        r.status === 'fulfilled'
          ? r.value
          : { month: m, year: y, totalIncome: 0, totalExpense: 0, performance: 0, days: [] }
      );

    setMonthsData(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadYear(year);
  }, [year, loadYear]);

  const yearIncome = monthsData.reduce((s, m) => s + m.totalIncome, 0);
  const yearExpense = monthsData.reduce((s, m) => s + m.totalExpense, 0);
  const yearPerf = yearIncome - yearExpense;

  const handleDayHover = (e: React.MouseEvent, day: DayData, month: number) => {
    setTooltip({ visible: true, x: e.clientX, y: e.clientY, day, month });
  };
  const handleDayLeave = () => setTooltip(t => ({ ...t, visible: false }));

  return (
    <>
      <style>{`
        .annual-wrap { font-family: var(--font-sans, sans-serif); }
        .annual-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px; }
        .year-nav { display: flex; align-items: center; gap: 8px; }
        .year-label { font-size: 20px; font-weight: 500; min-width: 56px; text-align: center; }
        .totals-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 1.25rem; }
        .total-card { background: hsl(var(--muted)); border-radius: 8px; padding: 10px 14px; }
        .total-label { font-size: 11px; color: hsl(var(--muted-foreground)); margin-bottom: 2px; }
        .total-value { font-size: 17px; font-weight: 500; }
        .months-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 900px) { .months-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 600px) { .months-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        .month-card { border: 1px solid hsl(var(--border)); border-radius: 10px; overflow: hidden; background: hsl(var(--card)); }
        .month-header { padding: 7px 9px 5px; border-bottom: 1px solid hsl(var(--border)); }
        .month-name { font-size: 12px; font-weight: 500; display: block; margin-bottom: 3px; }
        .month-stats { display: flex; gap: 6px; flex-wrap: wrap; }
        .month-stats span { font-size: 10px; }
        .weekday-row { display: grid; grid-template-columns: repeat(7, 1fr); padding: 3px 5px 1px; }
        .weekday-label { font-size: 8px; text-align: center; color: hsl(var(--muted-foreground)); opacity: 0.6; }
        .days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1.5px; padding: 3px 5px 5px; }
        .day-placeholder { aspect-ratio: 1; }
        .day-cell { aspect-ratio: 1; border-radius: 2px; font-size: 8px; font-weight: 500; display: flex; align-items: center; justify-content: center; cursor: default; transition: transform 0.08s; }
        .day-cell:hover { transform: scale(1.4); z-index: 10; position: relative; }
        .day-empty-data { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); opacity: 0.5; }
        .day-pos-strong { background: #8ac03f ; color: #27500A; }
        .day-pos-soft { background: #bcd996; color: #3B6D11; }
        .day-neg-strong { background: #d81c1c ; color: #791F1F; }
        .day-neg-soft { background: #ef9696; color: #A32D2D; }
        .day-neutral { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); }
        .legend { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: hsl(var(--muted-foreground)); }
        .legend-dot { width: 9px; height: 9px; border-radius: 2px; flex-shrink: 0; }
        .ann-tooltip { position: fixed; z-index: 9999; pointer-events: none; background: hsl(var(--popover)); border: 1px solid hsl(var(--border)); border-radius: 8px; padding: 8px 10px; font-size: 12px; min-width: 148px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .tt-date { font-weight: 500; font-size: 11px; margin-bottom: 5px; color: hsl(var(--foreground)); }
        .tt-row { display: flex; justify-content: space-between; gap: 14px; font-size: 11px; color: hsl(var(--muted-foreground)); padding: 1px 0; }
        .tt-pos { color: #3B6D11; font-weight: 500; }
        .tt-neg { color: #A32D2D; font-weight: 500; }
      `}</style>

      <div className="annual-wrap">
        {/* Tooltip */}
        {tooltip.visible && tooltip.day && (
          <div
            className="ann-tooltip"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
          >
            <div className="tt-date">
              {String(tooltip.day.day).padStart(2, '0')}/{String(tooltip.month + 1).padStart(2, '0')}/{year}
            </div>
            {tooltip.day.income > 0 && (
              <div className="tt-row">
                <span>Entrada</span>
                <span className="tt-pos">+{fmt(tooltip.day.income)}</span>
              </div>
            )}
            {tooltip.day.expense > 0 && (
              <div className="tt-row">
                <span>Saída</span>
                <span className="tt-neg">-{fmt(tooltip.day.expense)}</span>
              </div>
            )}
            <div className="tt-row" style={{ borderTop: '1px solid hsl(var(--border))', marginTop: 4, paddingTop: 4 }}>
              <span>Saldo acum.</span>
              <span className={tooltip.day.balance >= 0 ? 'tt-pos' : 'tt-neg'}>
                {fmt(tooltip.day.balance)}
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="annual-header">
          <div className="year-nav">
            <Button variant="outline" size="icon" onClick={() => setYear(y => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="year-label">{year}</span>
            <Button variant="outline" size="icon" onClick={() => setYear(y => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: '#8ac03f ' }} />Positivo alto</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#bcd996' }} />Positivo</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#ef9696' }} />Negativo</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: '#d81c1c ' }} />Negativo alto</div>
          </div>
        </div>

        {/* Year totals */}
        {!loading && monthsData.length > 0 && (
          <div className="totals-row">
            <div className="total-card">
              <div className="total-label">Entradas no ano</div>
              <div className="total-value" style={{ color: '#3B6D11' }}>{fmt(yearIncome)}</div>
            </div>
            <div className="total-card">
              <div className="total-label">Saídas no ano</div>
              <div className="total-value" style={{ color: '#A32D2D' }}>{fmt(yearExpense)}</div>
            </div>
            <div className="total-card">
              <div className="total-label">Performance anual</div>
              <div className="total-value" style={{ color: yearPerf >= 0 ? '#3B6D11' : '#A32D2D' }}>
                {yearPerf >= 0 ? '+' : ''}{fmt(yearPerf)}
              </div>
            </div>
          </div>
        )}

        {/* Calendar grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <div className="months-grid">
            {monthsData.map(md => (
              <MonthCard
                key={`${md.year}-${md.month}`}
                data={md}
                onDayHover={handleDayHover}
                onDayLeave={handleDayLeave}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}