'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts } from '@/hooks/use-finance';
import { accountTypeMeta } from '@/lib/accounts';

const ALL = '__all__';

type Props = {
  id?: string;
  value: string | undefined;
  onChange: (accountId: string | undefined) => void;
  /** Mostra a opção "Todas as contas" (valor undefined) */
  allowAll?: boolean;
  /** Esconde uma conta (ex.: a de origem numa transferência) */
  exclude?: string;
  disabled?: boolean;
  className?: string;
};

export function AccountSelect({ id, value, onChange, allowAll, exclude, disabled, className }: Props) {
  const { data: accounts = [], isLoading } = useAccounts();
  // Contas arquivadas só aparecem se já estiverem selecionadas
  const options = accounts.filter((a) => a.id !== exclude && (!a.isArchived || a.id === value));

  if (isLoading) return <div className={`h-9 rounded-md border bg-muted animate-pulse ${className ?? 'w-full'}`} />;

  return (
    <Select
      value={value ?? (allowAll ? ALL : undefined)}
      onValueChange={(v) => onChange(v === ALL ? undefined : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={className ?? 'w-full'}>
        <SelectValue placeholder="Selecione a conta" />
      </SelectTrigger>
      <SelectContent position="popper">
        {allowAll && <SelectItem value={ALL}>Todas as contas</SelectItem>}
        {options.map((a) => {
          const Icon = accountTypeMeta(a.type).icon;
          return (
            <SelectItem key={a.id} value={a.id}>
              <span className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" style={{ color: a.color }} aria-hidden />
                {a.name}
                {a.isArchived && <span className="text-xs text-muted-foreground">(arquivada)</span>}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
