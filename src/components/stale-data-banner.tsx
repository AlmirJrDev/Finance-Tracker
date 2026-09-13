'use client';

import { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, todayStr, addDays } from '@/lib/dates';
import type { Freshness } from '@/types/finance';

const SNOOZE_KEY = 'staleBannerSnoozedUntil';
const SNOOZE_DAYS = 3;

function readSnooze(): string | null {
  try {
    return localStorage.getItem(SNOOZE_KEY);
  } catch {
    return null;
  }
}

type Props = {
  freshness: Freshness;
  overdueCount: number;
  onAdjustBalances: () => void;
  onReviewPending: () => void;
};

/** Avisa quando o usuário está há muito tempo sem lançar: a projeção deixa de ser confiável. */
export function StaleDataBanner({ freshness, overdueCount, onAdjustBalances, onReviewPending }: Props) {
  const [snoozedUntil, setSnoozedUntil] = useState(readSnooze);
  if (!freshness.stale || (snoozedUntil && snoozedUntil >= todayStr())) return null;

  const since = freshness.lastActivityAt ? formatDate(freshness.lastActivityAt.slice(0, 10)) : null;

  const snooze = () => {
    const until = addDays(todayStr(), SNOOZE_DAYS);
    try {
      localStorage.setItem(SNOOZE_KEY, until);
    } catch {
      /* armazenamento indisponível: esconde só nesta visita */
    }
    setSnoozedUntil(until);
  };

  return (
    <section
      role="status"
      aria-label="Dados desatualizados"
      className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm"
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden />
        <div className="flex-1 space-y-2">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Seus dados estão parados há {freshness.daysSinceActivity} dias{since ? ` (desde ${since})` : ''}.
          </p>
          <p className="text-muted-foreground">
            A projeção só enxerga o que está cadastrado (principalmente contas fixas), então o futuro pode parecer melhor do que é.
            Pra voltar a confiar nos números, confira o saldo real das contas
            {overdueCount > 0 ? ` e revise as ${overdueCount} ocorrência(s) que ficaram a confirmar` : ''}.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={onAdjustBalances}>
              Conferir saldos
            </Button>
            {overdueCount > 0 && (
              <Button size="sm" variant="outline" onClick={onReviewPending}>
                Revisar pendências ({overdueCount})
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={snooze}>
              Lembrar em {SNOOZE_DAYS} dias
            </Button>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={snooze} aria-label="Fechar aviso">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
