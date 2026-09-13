// Datas de negócio são strings "YYYY-MM-DD" e meses "YYYY-MM".
// Nada de new Date("2026-03-05"), que é interpretado em UTC e muda de dia no Brasil.

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toMonthStr(year: number, month: number): string {
  return `${year}-${pad(month)}`;
}

export function parseMonth(ym: string): { year: number; month: number } {
  const [year, month] = ym.split('-').map(Number);
  return { year, month };
}

export function addMonths(ym: string, n: number): string {
  const { year, month } = parseMonth(ym);
  const index = year * 12 + (month - 1) + n;
  return toMonthStr(Math.floor(index / 12), (index % 12) + 1);
}

export function daysInMonth(ym: string): number {
  const { year, month } = parseMonth(ym);
  return new Date(year, month, 0).getDate();
}

/** Hoje no fuso do navegador. */
export function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonthStr(): string {
  return todayStr().slice(0, 7);
}

export function monthLabel(ym: string, short = false): string {
  const { year, month } = parseMonth(ym);
  const name = MONTHS[month - 1];
  return short ? `${name.slice(0, 3)}/${String(year).slice(2)}` : `${name} ${year}`;
}

/** "2026-09-05" → "05/09/2026" */
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

/** "2026-09-05" → "sáb, 05/09" */
export function formatDayShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()].slice(0, 3).toLowerCase();
  return `${weekday}, ${pad(d)}/${pad(m)}`;
}

/** Dia da semana (0 = domingo) do primeiro dia do mês. */
export function firstWeekday(ym: string): number {
  const { year, month } = parseMonth(ym);
  return new Date(year, month - 1, 1).getDay();
}

/** Mesmo dia em outro mês, limitado ao último dia (31 → 30/28). */
export function sameDayInMonth(ym: string, day: number): string {
  return `${ym}-${pad(Math.min(day, daysInMonth(ym)))}`;
}
