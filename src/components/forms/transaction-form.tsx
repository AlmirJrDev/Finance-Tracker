'use client';

import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategorySelect } from '@/components/forms/category-select';
import { useInstallmentMutations, useSaveTransaction } from '@/hooks/use-finance';
import { ApiError } from '@/lib/api';
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money';
import { addMonthsToDate, currentMonthStr, formatDate, todayStr } from '@/lib/dates';
import { playNotificationSound } from '@/lib/notification';
import type { Transaction } from '@/types/finance';

export const MAX_INSTALLMENTS = 72;

const schema = z
  .object({
    type: z.enum(['income', 'expense']),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
    description: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(200),
    amount: z
      .string()
      .refine((v) => (parseAmountToCents(v) ?? 0) > 0, 'Informe um valor maior que zero (ex.: 49,90)'),
    categoryId: z.string().nullable(),
    note: z.string().max(500),
    paid: z.boolean(),
    /** O usuário mexeu no "pago"? Se não, ele acompanha a data. */
    paidTouched: z.boolean(),
    parcelado: z.boolean(),
    installments: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.parcelado) return;
    const n = Number(v.installments);
    if (!Number.isInteger(n) || n < 2 || n > MAX_INSTALLMENTS) {
      ctx.addIssue({ code: 'custom', path: ['installments'], message: `De 2 a ${MAX_INSTALLMENTS} parcelas` });
    }
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  /** Mês em exibição; define a data sugerida para novas transações. */
  month: string;
  onSaved?: (transaction: Transaction) => void;
};

function defaults(transaction: Transaction | null, month: string): FormValues {
  if (transaction) {
    return {
      type: transaction.type,
      date: transaction.date,
      description: transaction.description,
      amount: centsToInput(transaction.amountCents),
      categoryId: transaction.categoryId,
      note: transaction.note ?? '',
      paid: transaction.status === 'paid',
      paidTouched: true,
      parcelado: false,
      installments: '2',
    };
  }
  const today = todayStr();
  // Hoje, se o mês em exibição for o atual; senão o dia 1 do mês selecionado
  const date = month === currentMonthStr() ? today : `${month}-01`;
  return {
    type: 'expense',
    date,
    description: '',
    amount: '',
    categoryId: null,
    note: '',
    paid: date <= today,
    paidTouched: false,
    parcelado: false,
    installments: '2',
  };
}

/** Prévia do parcelamento, igual à divisão feita pela API (resto na 1ª parcela). */
function installmentPreview(totalCents: number, n: number, firstDate: string) {
  const base = Math.floor(totalCents / n);
  const first = base + (totalCents - base * n);
  return { base, first, lastDate: addMonthsToDate(firstDate, n - 1) };
}

export default function TransactionForm({ open, onOpenChange, transaction, month, onSaved }: Props) {
  const save = useSaveTransaction();
  const installments = useInstallmentMutations();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(transaction, month) });
  const { register, control, handleSubmit, reset, setError, setValue, getValues, formState } = form;
  const [type, parcelado, amount, count, date] = useWatch({
    control,
    name: ['type', 'parcelado', 'amount', 'installments', 'date'],
  });

  useEffect(() => {
    if (open) reset(defaults(transaction, month));
  }, [open, transaction, month, reset]);

  const totalCents = parseAmountToCents(amount) ?? 0;
  const n = Number(count);
  const preview = parcelado && totalCents >= n && n >= 2 && n <= MAX_INSTALLMENTS ? installmentPreview(totalCents, n, date) : null;
  const isPending = save.isPending || installments.create.isPending;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const base = {
        type: values.type,
        date: values.date,
        description: values.description,
        categoryId: values.categoryId,
        note: values.note.trim() || null,
      };

      if (!transaction && values.parcelado) {
        const created = await installments.create.mutateAsync({
          ...base,
          totalAmountCents: parseAmountToCents(values.amount)!,
          installments: Number(values.installments),
        });
        playNotificationSound();
        toast.success(`Compra parcelada em ${created.length}x`, { description: values.description });
        onSaved?.(created[0]);
      } else {
        const saved = await save.mutateAsync({
          id: transaction?.id,
          input: {
            ...base,
            amountCents: parseAmountToCents(values.amount)!,
            status: values.paid ? 'paid' : 'pending',
          },
        });
        playNotificationSound();
        toast.success(transaction ? 'Transação atualizada' : 'Transação adicionada', { description: saved.description });
        onSaved?.(saved);
      }
      onOpenChange(false);
    } catch (err) {
      // Só fecha quando a API confirmou; erros de validação voltam para o campo
      if (err instanceof ApiError && err.details?.length) {
        for (const d of err.details) {
          const field = d.path === 'amountCents' || d.path === 'totalAmountCents' ? 'amount' : d.path;
          if (field in values) setError(field as keyof FormValues, { message: d.message });
        }
      }
      toast.error('Não foi possível salvar', { description: (err as Error).message });
    }
  });

  const fieldError = (name: keyof FormValues) =>
    formState.errors[name] && <p className="text-xs text-destructive">{formState.errors[name]?.message}</p>;

  const dateField = register('date', {
    onChange: (e) => {
      // Enquanto o usuário não escolher, data futura = pendente
      if (!getValues('paidTouched')) setValue('paid', e.target.value <= todayStr());
    },
  });

  const paidLabel = type === 'income' ? 'Recebido' : 'Pago';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          <DialogDescription>
            {transaction
              ? 'Modifique os detalhes da transação abaixo.'
              : 'Adicione uma nova entrada ou saída ao seu controle financeiro.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-2" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Entrada</SelectItem>
                      <SelectItem value="expense">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">{parcelado ? 'Data da 1ª parcela' : 'Data'}</Label>
              <Input id="date" type="date" {...dateField} />
              {fieldError('date')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" placeholder="Ex: Salário, Conta de luz, etc." {...register('description')} />
            {fieldError('description')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">{parcelado ? 'Valor total (R$)' : 'Valor (R$)'}</Label>
              <Input id="amount" inputMode="decimal" placeholder="0,00" autoComplete="off" {...register('amount')} />
              {fieldError('amount')}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Categoria</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => <CategorySelect id="categoryId" value={field.value} onChange={field.onChange} />}
              />
            </div>
          </div>

          {!transaction && (
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="parcelado" className="font-normal">
                  Compra parcelada
                </Label>
                <Controller
                  control={control}
                  name="parcelado"
                  render={({ field }) => <Switch id="parcelado" checked={field.value} onCheckedChange={field.onChange} />}
                />
              </div>
              {parcelado && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="installments"
                      aria-label="Número de parcelas"
                      type="number"
                      min={2}
                      max={MAX_INSTALLMENTS}
                      className="w-20"
                      {...register('installments')}
                    />
                    <span className="text-sm text-muted-foreground">parcelas mensais</span>
                  </div>
                  {fieldError('installments')}
                  {preview && (
                    <p className="text-sm text-muted-foreground">
                      {n}x de <strong className="text-foreground">{formatCents(preview.base)}</strong>
                      {preview.first !== preview.base && ` (1ª de ${formatCents(preview.first)})`}, até {formatDate(preview.lastDate)}.
                      Parcelas futuras ficam pendentes.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!parcelado && (
            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <Label htmlFor="paid" className="font-normal">
                  {paidLabel}
                </Label>
                <p className="text-xs text-muted-foreground">Desligado = previsto, entra só na projeção de saldo.</p>
              </div>
              <Controller
                control={control}
                name="paid"
                render={({ field }) => (
                  <Switch
                    id="paid"
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setValue('paidTouched', true);
                    }}
                  />
                )}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Observação</Label>
            <Textarea id="note" placeholder="Adicione uma observação (opcional)" className="resize-none" {...register('note')} />
          </div>

          {transaction?.recurringId && (
            <p className="text-xs text-muted-foreground">Gerada por uma recorrência. Alterar aqui muda só esta ocorrência.</p>
          )}
          {transaction?.installment && (
            <p className="text-xs text-muted-foreground">
              Parcela {transaction.installment.number} de {transaction.installment.total}. Alterar aqui muda só esta parcela.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {transaction ? 'Atualizar' : parcelado ? 'Parcelar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
