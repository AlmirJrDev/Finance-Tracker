'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, CalendarRange, Edit, Loader2, MoreVertical, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CategorySelect } from '@/components/forms/category-select';
import { useRecurring, useRecurringMutations } from '@/hooks/use-finance';
import { addMonths, formatDate, monthLabel, todayStr, WEEKDAYS } from '@/lib/dates';
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money';
import { playNotificationSound } from '@/lib/notification';
import type { RecurringTransaction } from '@/types/finance';

const schema = z
  .object({
    type: z.enum(['income', 'expense']),
    description: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(200),
    amount: z.string().refine((v) => (parseAmountToCents(v) ?? 0) > 0, 'Informe um valor maior que zero'),
    categoryId: z.string().nullable(),
    frequency: z.enum(['monthly', 'weekly', 'daily']),
    dayOfMonth: z.string(),
    dayOfWeek: z.string(),
    startDate: z.string().min(1, 'Informe a data de início'),
    endDate: z.string(),
    note: z.string().max(500),
  })
  .superRefine((v, ctx) => {
    const day = Number(v.dayOfMonth);
    if (v.frequency === 'monthly' && !(Number.isInteger(day) && day >= 1 && day <= 31)) {
      ctx.addIssue({ code: 'custom', path: ['dayOfMonth'], message: 'Dia entre 1 e 31' });
    }
    if (v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Deve ser depois do início' });
    }
  });

type FormValues = z.infer<typeof schema>;

function defaults(item: RecurringTransaction | null): FormValues {
  return {
    type: item?.type ?? 'expense',
    description: item?.description ?? '',
    amount: item ? centsToInput(item.amountCents) : '',
    categoryId: item?.categoryId ?? null,
    frequency: item?.frequency ?? 'monthly',
    dayOfMonth: String(item?.dayOfMonth ?? Number(todayStr().slice(8, 10))),
    dayOfWeek: String(item?.dayOfWeek ?? 1),
    // Editar não reinicia a data de início (bug da versão anterior)
    startDate: item?.startDate ?? `${todayStr().slice(0, 7)}-01`,
    endDate: item?.endDate ?? '',
    note: item?.note ?? '',
  };
}

function describeSchedule(r: RecurringTransaction) {
  const base =
    r.frequency === 'monthly'
      ? `Todo dia ${r.dayOfMonth}`
      : r.frequency === 'weekly'
        ? `Toda ${WEEKDAYS[r.dayOfWeek ?? 0].toLowerCase()}`
        : 'Todos os dias';
  return r.endDate ? `${base} até ${formatDate(r.endDate)}` : base;
}

export default function RecurringTransactions({ month }: { month: string }) {
  const { data: items = [], isLoading } = useRecurring();
  const { save, toggle, remove, apply } = useRecurringMutations();
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmRange, setConfirmRange] = useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults(null) });
  const { register, control, handleSubmit, reset, formState } = form;
  const frequency = useWatch({ control, name: 'frequency' });

  useEffect(() => {
    if (formOpen) reset(defaults(editing));
  }, [formOpen, editing, reset]);

  const activeCount = items.filter((r) => r.isActive).length;
  const rangeEnd = addMonths(month, 11);

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({
        id: editing?.id,
        input: {
          type: v.type,
          description: v.description,
          amountCents: parseAmountToCents(v.amount)!,
          categoryId: v.categoryId,
          frequency: v.frequency,
          dayOfMonth: v.frequency === 'monthly' ? Number(v.dayOfMonth) : null,
          dayOfWeek: v.frequency === 'weekly' ? Number(v.dayOfWeek) : null,
          isActive: editing?.isActive ?? true,
          startDate: v.startDate,
          endDate: v.endDate || null,
          note: v.note.trim() || null,
        },
      });
      playNotificationSound();
      toast.success(editing ? 'Recorrência atualizada.' : 'Recorrência criada.', {
        description: 'Use "Aplicar" para gerar as transações nos meses desejados.',
      });
      setFormOpen(false);
    } catch (err) {
      toast.error('Erro ao salvar', { description: (err as Error).message });
    }
  });

  const runApply = async (from: string, to: string) => {
    try {
      const result = await apply.mutateAsync({ from, to });
      playNotificationSound();
      toast.success(
        result.created > 0 ? `${result.created} transação(ões) criada(s).` : 'Nada novo para criar.',
        { description: result.existing > 0 ? `${result.existing} já existia(m) e foram mantidas.` : undefined }
      );
      setConfirmRange(false);
    } catch (err) {
      toast.error('Erro ao aplicar', { description: (err as Error).message });
    }
  };

  const fieldError = (name: keyof FormValues) =>
    formState.errors[name] && <p className="text-xs text-destructive">{formState.errors[name]?.message}</p>;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle>Transações Recorrentes</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmRange(true)}
              disabled={activeCount === 0 || apply.isPending}
              className="flex items-center gap-1"
            >
              <CalendarRange className="h-4 w-4" />
              Aplicar nos próximos 12 meses
            </Button>
            <Button
              variant="outline"
              onClick={() => runApply(month, month)}
              disabled={activeCount === 0 || apply.isPending}
              className="flex items-center gap-1"
            >
              {apply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Aplicar em {monthLabel(month)} ({activeCount})
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Nova Recorrente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id} className={r.isActive ? '' : 'opacity-60'}>
                    <TableCell>{r.description}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {describeSchedule(r)}
                      <p className="text-xs text-muted-foreground">desde {formatDate(r.startDate)}</p>
                    </TableCell>
                    <TableCell className={r.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {formatCents(r.amountCents)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.category ? `${r.category.icon ?? ''} ${r.category.name}` : '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.isActive ? 'default' : 'secondary'}>{r.isActive ? 'Ativa' : 'Pausada'}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Ações">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(r);
                              setFormOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggle.mutate({ id: r.id, isActive: !r.isActive })}>
                            {r.isActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                            {r.isActive ? 'Pausar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={async () => {
                              if (!confirm(`Excluir "${r.description}"? As transações já geradas continuam no histórico.`)) return;
                              try {
                                await remove.mutateAsync(r.id);
                                toast.success('Recorrência removida.');
                              } catch (err) {
                                toast.error('Erro ao excluir', { description: (err as Error).message });
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Você ainda não cadastrou transações recorrentes.</p>
              <p>Adicione suas despesas e receitas fixas para automatizar seu controle financeiro.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Recorrência' : 'Nova Recorrência'}</DialogTitle>
            <DialogDescription>Um pagamento ou recebimento que se repete.</DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4 py-2" noValidate>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rec-type">Tipo</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="rec-type" className="w-full">
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
                <Label htmlFor="rec-amount">Valor (R$)</Label>
                <Input id="rec-amount" inputMode="decimal" placeholder="0,00" {...register('amount')} />
                {fieldError('amount')}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-description">Descrição</Label>
              <Input id="rec-description" placeholder="Ex: Aluguel, Salário, Academia" {...register('description')} />
              {fieldError('description')}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rec-frequency">Frequência</Label>
                <Controller
                  control={control}
                  name="frequency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="rec-frequency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="daily">Diária</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label htmlFor="rec-day">Dia do mês</Label>
                  <Input id="rec-day" type="number" min={1} max={31} {...register('dayOfMonth')} />
                  {fieldError('dayOfMonth')}
                </div>
              )}
              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="rec-weekday">Dia da semana</Label>
                  <Controller
                    control={control}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="rec-weekday" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((name, i) => (
                            <SelectItem key={name} value={String(i)}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rec-start">Início</Label>
                <Input id="rec-start" type="date" {...register('startDate')} />
                {fieldError('startDate')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rec-end">Fim (opcional)</Label>
                <Input id="rec-end" type="date" {...register('endDate')} />
                {fieldError('endDate')}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-category">Categoria</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => <CategorySelect id="rec-category" value={field.value} onChange={field.onChange} />}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rec-note">Observação</Label>
              <Textarea id="rec-note" placeholder="Opcional" className="resize-none" {...register('note')} />
            </div>

            {editing && (
              <p className="text-xs text-muted-foreground">
                Alterações valem para as próximas aplicações; transações já geradas não mudam.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? 'Atualizar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRange} onOpenChange={setConfirmRange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Aplicar nos próximos 12 meses</DialogTitle>
            <DialogDescription>
              Gera as transações das {activeCount} recorrência(s) ativa(s) de {monthLabel(month)} até{' '}
              {monthLabel(rangeEnd)}.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Pode aplicar quantas vezes quiser: o que já foi gerado não é duplicado.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRange(false)}>
              Cancelar
            </Button>
            <Button onClick={() => runApply(month, rangeEnd)} disabled={apply.isPending}>
              {apply.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
