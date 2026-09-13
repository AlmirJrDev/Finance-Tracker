import { describe, expect, it } from 'vitest';
import { centsToInput, formatCents, parseAmountToCents } from './money';
import { addMonths, formatDate, monthLabel, sameDayInMonth } from './dates';

describe('parseAmountToCents', () => {
  it.each([
    ['49,90', 4990],
    ['1.234,56', 123456],
    ['1234.56', 123456],
    ['R$ 12', 1200],
    ['0,1', 10],
    ['1.000.000', 100000000],
  ])('"%s" → %i', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '12,345', '-5', '1,2,3'])('rejeita "%s"', (input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });

  it('não sofre com erro de ponto flutuante', () => {
    expect(parseAmountToCents('0,29')).toBe(29);
    expect(parseAmountToCents('1,15')).toBe(115);
  });

  it('ida e volta com centsToInput', () => {
    expect(parseAmountToCents(centsToInput(123456))).toBe(123456);
  });
});

describe('formatação', () => {
  it('formata centavos em reais', () => {
    expect(formatCents(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });

  it('datas sem depender de fuso', () => {
    expect(formatDate('2026-03-01')).toBe('01/03/2026');
    expect(monthLabel('2026-09')).toBe('Setembro 2026');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(sameDayInMonth('2026-02', 31)).toBe('2026-02-28');
  });
});
