'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore, ArrowLeftRight, Check, Loader2, MoreVertical, Pencil, Plus, Scale, Star, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccountSelect } from '@/components/forms/account-select';
import { useAccountMutations, useAccounts } from '@/hooks/use-finance';
import { ApiError } from '@/lib/api';
import { ACCOUNT_TYPES, accountTypeMeta } from '@/lib/accounts';
import { todayStr } from '@/lib/dates';
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money';
import type { Account, AccountType } from '@/types/finance';

type Mode =
  | { kind: 'list' }
  | { kind: 'form'; account?: Account }
  | { kind: 'adjust'; account: Account }
  | { kind: 'transfer'; from?: string }
  | { kind: 'delete'; account: Account };

function fail(action: string, err: unknown) {
  toast.error(`Não foi possível ${action}`, { description: (err as Error).message });
}

function AccountForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const { create, update } = useAccountMutations();
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking');
  const [color, setColor] = useState(account?.color ?? '#10B981');
  const busy = create.isPending || update.isPending;

  const submit = async () => {
    if (name.trim().length < 2) return toast.error('Dê um nome com pelo menos 2 letras.');
    try {
      if (account) await update.mutateAsync({ id: account.id, name: name.trim(), type, color });
      else await create.mutateAsync({ name: name.trim(), type, color });
      toast.success(account ? 'Conta atualizada.' : 'Conta criada.');
      onDone();
    } catch (err) {
      fail('salvar a conta', err);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="acc-name">Nome</Label>
        <Input id="acc-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank, Carteira" />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-2">
          <Label htmlFor="acc-type">Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
            <SelectTrigger id="acc-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-2">
                    <t.icon className="h-3.5 w-3.5" aria-hidden /> {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acc-color">Cor</Label>
          <input id="acc-color" type="color" className="h-9 w-12 cursor-pointer rounded border bg-transparent" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </div>
      {type === 'credit_card' && (
        <p className="text-xs text-muted-foreground">
          Compras no cartão entram como despesa. O pagamento da fatura deve ser uma transferência da conta corrente para o cartão, pra não contar o gasto duas vezes.
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Voltar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {account ? 'Salvar' : 'Criar conta'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AdjustForm({ account, onDone }: { account: Account; onDone: () => void }) {
  const { adjust } = useAccountMutations();
  const [value, setValue] = useState(centsToInput(Math.abs(account.balanceCents)));
  const [negative, setNegative] = useState(account.balanceCents < 0);
  const [date, setDate] = useState(todayStr());

  const submit = async () => {
    const cents = parseAmountToCents(value);
    if (cents === null) return toast.error('Informe um valor válido.');
    try {
      const result = await adjust.mutateAsync({ id: account.id, balanceCents: negative ? -cents : cents, date });
      toast.success(result ? 'Saldo ajustado.' : 'O saldo já estava nesse valor.');
      onDone();
    } catch (err) {
      fail('ajustar o saldo', err);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <p className="text-sm text-muted-foreground">
        Informe o saldo real de <strong className="text-foreground">{account.name}</strong> (como aparece no banco). O app cria um lançamento de ajuste com a diferença, que não conta como receita nem despesa.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="adj-value">Saldo em {date.split('-').reverse().join('/')}</Label>
          <div className="flex gap-1">
            <Button type="button" variant="outline" size="icon" onClick={() => setNegative(!negative)} aria-label={negative ? 'Saldo negativo' : 'Saldo positivo'} title="Alternar sinal">
              {negative ? '−' : '+'}
            </Button>
            <Input id="adj-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="adj-date">Data</Label>
          <Input id="adj-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Saldo pago atual no app: {formatCents(account.balanceCents)}</p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Voltar
        </Button>
        <Button type="submit" disabled={adjust.isPending}>
          {adjust.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Ajustar saldo
        </Button>
      </DialogFooter>
    </form>
  );
}

function TransferForm({ from: initialFrom, onDone }: { from?: string; onDone: () => void }) {
  const { transfer } = useAccountMutations();
  const [from, setFrom] = useState<string | undefined>(initialFrom);
  const [to, setTo] = useState<string | undefined>();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState('');

  const submit = async () => {
    const cents = parseAmountToCents(amount);
    if (!from || !to) return toast.error('Escolha as duas contas.');
    if (!cents) return toast.error('Informe um valor maior que zero.');
    try {
      await transfer.mutateAsync({ fromAccountId: from, toAccountId: to, amountCents: cents, date, description: description.trim() || undefined });
      toast.success('Transferência registrada.');
      onDone();
    } catch (err) {
      fail('transferir', err);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tr-from">De</Label>
          <AccountSelect id="tr-from" value={from} onChange={setFrom} exclude={to} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tr-to">Para</Label>
          <AccountSelect id="tr-to" value={to} onChange={setTo} exclude={from} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tr-amount">Valor (R$)</Label>
          <Input id="tr-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tr-date">Data</Label>
          <Input id="tr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tr-desc">Descrição (opcional)</Label>
        <Input id="tr-desc" placeholder="Ex.: Pagamento da fatura" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">Muda o saldo das duas contas, sem contar como receita ou despesa.</p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Voltar
        </Button>
        <Button type="submit" disabled={transfer.isPending}>
          {transfer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Transferir
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeleteForm({ account, onDone }: { account: Account; onDone: () => void }) {
  const { remove, update } = useAccountMutations();
  const [moveTo, setMoveTo] = useState<string | undefined>();
  const hasData = account.transactionCount > 0;

  const run = async () => {
    try {
      const result = await remove.mutateAsync({ id: account.id, moveTo: hasData ? moveTo : undefined });
      toast.success('Conta removida.', { description: result.movedCount ? `${result.movedCount} lançamento(s) movido(s).` : undefined });
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ACCOUNT_NOT_EMPTY') toast.error('Escolha para onde mover os lançamentos.');
      else fail('remover a conta', err);
    }
  };

  return (
    <div className="space-y-4">
      {hasData ? (
        <>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{account.name}</strong> tem {account.transactionCount} lançamento(s). Pra não perder histórico, você pode <strong className="text-foreground">arquivar</strong> a conta, ou mover os lançamentos pra outra conta e remover.
          </p>
          <div className="space-y-2">
            <Label htmlFor="del-move">Mover lançamentos para</Label>
            <AccountSelect id="del-move" value={moveTo} onChange={setMoveTo} exclude={account.id} />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Remover a conta {account.name}? Ela não tem lançamentos.</p>
      )}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onDone}>
          Voltar
        </Button>
        {hasData && (
          <Button
            variant="secondary"
            disabled={update.isPending}
            onClick={async () => {
              try {
                await update.mutateAsync({ id: account.id, isArchived: true });
                toast.success('Conta arquivada.');
                onDone();
              } catch (err) {
                fail('arquivar', err);
              }
            }}
          >
            Arquivar
          </Button>
        )}
        <Button variant="destructive" disabled={remove.isPending || (hasData && !moveTo)} onClick={run}>
          {remove.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {hasData ? 'Mover e remover' : 'Remover'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function AccountsManager({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: accounts = [], isLoading } = useAccounts();
  const { update } = useAccountMutations();
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [showArchived, setShowArchived] = useState(false);
  const back = () => setMode({ kind: 'list' });

  const visible = accounts.filter((a) => showArchived || !a.isArchived);
  const archivedCount = accounts.filter((a) => a.isArchived).length;
  const total = accounts.filter((a) => !a.isArchived).reduce((s, a) => s + a.balanceCents, 0);
  const totalProjected = accounts.filter((a) => !a.isArchived).reduce((s, a) => s + a.projectedBalanceCents, 0);

  const titles: Record<Mode['kind'], string> = {
    list: 'Contas',
    form: mode.kind === 'form' && mode.account ? 'Editar conta' : 'Nova conta',
    adjust: 'Ajustar saldo',
    transfer: 'Transferência entre contas',
    delete: 'Remover conta',
  };

  const quickUpdate = async (id: string, input: Parameters<typeof update.mutateAsync>[0], message: string) => {
    try {
      await update.mutateAsync({ ...input, id });
      toast.success(message);
    } catch (err) {
      fail('atualizar a conta', err);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) back();
      }}
    >
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titles[mode.kind]}</DialogTitle>
          {mode.kind === 'list' && (
            <DialogDescription>
              Saldo total: <strong className="text-foreground">{formatCents(total)}</strong>
              {totalProjected !== total && <> · previsto no fim do mês {formatCents(totalProjected)}</>}
            </DialogDescription>
          )}
        </DialogHeader>

        {mode.kind === 'form' && <AccountForm account={mode.account} onDone={back} />}
        {mode.kind === 'adjust' && <AdjustForm account={mode.account} onDone={back} />}
        {mode.kind === 'transfer' && <TransferForm from={mode.from} onDone={back} />}
        {mode.kind === 'delete' && <DeleteForm account={mode.account} onDone={back} />}

        {mode.kind === 'list' && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setMode({ kind: 'form' })}>
                <Plus className="mr-1 h-4 w-4" /> Nova conta
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode({ kind: 'transfer' })} disabled={accounts.filter((a) => !a.isArchived).length < 2}>
                <ArrowLeftRight className="mr-1 h-4 w-4" /> Transferir
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ul className="divide-y rounded-md border">
                {visible.map((a) => {
                  const meta = accountTypeMeta(a.type);
                  return (
                    <li key={a.id} className={`flex items-center gap-3 p-3 ${a.isArchived ? 'opacity-60' : ''}`}>
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${a.color}22` }}>
                        <meta.icon className="h-4 w-4" style={{ color: a.color }} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-sm font-medium">
                          {a.name}
                          {a.isDefault && <Badge variant="secondary" className="text-[10px]">padrão</Badge>}
                          {a.isArchived && <Badge variant="outline" className="text-[10px]">arquivada</Badge>}
                          {a.provider && <Badge variant="outline" className="text-[10px]">{a.provider.connectorName ?? 'banco'}</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {meta.label} · {a.transactionCount} lançamento(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold tabular-nums ${a.balanceCents < 0 ? 'text-red-600' : ''}`}>{formatCents(a.balanceCents)}</p>
                        {a.projectedBalanceCents !== a.balanceCents && (
                          <p className="text-xs text-muted-foreground tabular-nums">fim do mês {formatCents(a.projectedBalanceCents)}</p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Ações de ${a.name}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setMode({ kind: 'form', account: a })}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMode({ kind: 'adjust', account: a })}>
                            <Scale className="mr-2 h-4 w-4" /> Ajustar saldo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMode({ kind: 'transfer', from: a.id })} disabled={a.isArchived}>
                            <ArrowLeftRight className="mr-2 h-4 w-4" /> Transferir daqui
                          </DropdownMenuItem>
                          {!a.isDefault && !a.isArchived && (
                            <DropdownMenuItem onClick={() => quickUpdate(a.id, { id: a.id, isDefault: true }, `${a.name} agora é a conta padrão.`)}>
                              <Star className="mr-2 h-4 w-4" /> Tornar padrão
                            </DropdownMenuItem>
                          )}
                          {!a.isDefault && (
                            <DropdownMenuItem
                              onClick={() => quickUpdate(a.id, { id: a.id, isArchived: !a.isArchived }, a.isArchived ? 'Conta reativada.' : 'Conta arquivada.')}
                            >
                              {a.isArchived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                              {a.isArchived ? 'Reativar' : 'Arquivar'}
                            </DropdownMenuItem>
                          )}
                          {!a.isDefault && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => setMode({ kind: 'delete', account: a })}>
                                <Trash2 className="mr-2 h-4 w-4" /> Remover
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            )}

            {archivedCount > 0 && (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? <X className="mr-1 h-4 w-4" /> : <Check className="mr-1 h-4 w-4" />}
                {showArchived ? 'Esconder arquivadas' : `Mostrar arquivadas (${archivedCount})`}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
