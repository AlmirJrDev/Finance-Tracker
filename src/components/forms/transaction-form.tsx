'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useSaveTransaction } from '@/hooks/use-finance';
import { ApiError } from '@/lib/api';
import { centsToInput, parseAmountToCents } from '@/lib/money';
import { currentMonthStr, todayStr } from '@/lib/dates';
import { playNotificationSound } from '@/lib/notification';
import type { Transaction } from '@/types/finance';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data'),
  description: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(200),
  amount: z
    .string()
    .refine((v) => (parseAmountToCents(v) ?? 0) > 0, 'Informe um valor maior que zero (ex.: 49,90)'),
  categoryId: z.string().nullable(),
  note: z.string().max(500),
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
    };
  }
  const today = todayStr();
  return {
    type: 'expense',
    // Hoje, se o mês em exibição for o atual; senão o dia 1 do mês selecionado
    date: month === currentMonthStr() ? today : `${month}-01`,
    description: '',
    amount: '',
    categoryId: null,
    note: '',
  };
}

export default function TransactionForm({ open, onOpenChange, transaction, month, onSaved }: Props) {
  const save = useSaveTransaction();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(transaction, month) });
  const { register, control, handleSubmit, reset, setError, formState } = form;

  useEffect(() => {
    if (open) reset(defaults(transaction, month));
  }, [open, transaction, month, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({
        id: transaction?.id,
        input: {
          type: values.type,
          date: values.date,
          description: values.description,
          amountCents: parseAmountToCents(values.amount)!,
          categoryId: values.categoryId,
          note: values.note.trim() || null,
        },
      });
      playNotificationSound();
      toast.success(transaction ? 'Transação atualizada' : 'Transação adicionada', {
        description: saved.description,
      });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      // Só fecha quando a API confirmou; erros de validação voltam para o campo
      if (err instanceof ApiError && err.details?.length) {
        for (const d of err.details) {
          const field = d.path === 'amountCents' ? 'amount' : d.path;
          if (field in values) setError(field as keyof FormValues, { message: d.message });
        }
      }
      toast.error('Não foi possível salvar', { description: (err as Error).message });
    }
  });

  const fieldError = (name: keyof FormValues) =>
    formState.errors[name] && <p className="text-xs text-destructive">{formState.errors[name]?.message}</p>;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...register('date')} />
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
              <Label htmlFor="amount">Valor (R$)</Label>
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

          <div className="space-y-2">
            <Label htmlFor="note">Observação</Label>
            <Textarea id="note" placeholder="Adicione uma observação (opcional)" className="resize-none" {...register('note')} />
          </div>

          {transaction?.recurringId && (
            <p className="text-xs text-muted-foreground">
              Gerada por uma recorrência. Alterar aqui muda só esta ocorrência.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {transaction ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
