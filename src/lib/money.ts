const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

/** "+R$ 1,2k" / "-R$ 350" — para espaços pequenos. */
export function formatCentsShort(cents: number, withSign = true): string {
  const value = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : withSign && cents > 0 ? '+' : '';
  if (value >= 1000) return `${sign}R$${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return `${sign}R$${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

/**
 * Converte o que o usuário digitou em centavos.
 * Aceita "1.234,56", "1234,56", "1234.56", "R$ 12" e "12".
 * Retorna null se não for um valor válido.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[R$\s]/g, '');
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(',')) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if ((cleaned.match(/\./g) ?? []).length > 1) {
    normalized = cleaned.replace(/\./g, '');
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Centavos → texto editável no formato brasileiro ("1234,50"). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
