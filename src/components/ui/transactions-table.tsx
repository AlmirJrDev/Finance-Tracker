'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Edit, MoreVertical, Repeat, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatDayShort } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import type { MonthSummary, Transaction } from '@/types/finance';

type Props = {
  summary: MonthSummary;
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
};

export function TransactionsTable({ summary, transactions, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) map.set(t.date, [...(map.get(t.date) ?? []), t]);
    return map;
  }, [transactions]);

  const days = summary.days.filter((d) => d.transactionCount > 0).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimentações do Mês</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Entradas</TableHead>
              <TableHead>Saídas</TableHead>
              <TableHead>Saldo do Dia</TableHead>
              <TableHead>Saldo Acumulado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  Nenhuma transação registrada para este mês.
                </TableCell>
              </TableRow>
            )}

            {days.map((day) => {
              const isOpen = expanded === day.date;
              const dayTransactions = byDate.get(day.date) ?? [];
              return (
                <Fragment key={day.date}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : day.date)}
                    aria-expanded={isOpen}
                  >
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {formatDayShort(day.date)}
                        <span className="text-xs text-muted-foreground">({day.transactionCount})</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-green-600">{day.incomeCents > 0 ? formatCents(day.incomeCents) : '-'}</TableCell>
                    <TableCell className="text-red-600">{day.expenseCents > 0 ? formatCents(day.expenseCents) : '-'}</TableCell>
                    <TableCell>{formatCents(day.incomeCents - day.expenseCents)}</TableCell>
                    <TableCell className={day.balanceCents < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                      {formatCents(day.balanceCents)}
                    </TableCell>
                  </TableRow>

                  {isOpen && (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="w-10" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dayTransactions.map((t) => {
                                const income = t.type === 'income';
                                return (
                                  <TableRow key={t.id}>
                                    <TableCell>
                                      <span className="inline-flex items-center gap-1">
                                        {t.recurringId && (
                                          <Repeat className="h-3 w-3 text-muted-foreground" aria-label="Recorrente" />
                                        )}
                                        {t.description}
                                      </span>
                                      {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
                                    </TableCell>
                                    <TableCell>
                                      {t.category ? (
                                        <Badge variant="outline" style={{ borderColor: t.category.color }}>
                                          {t.category.icon} {t.category.name}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className={income ? 'text-green-600' : 'text-red-600'}>
                                      {formatCents(t.amountCents)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={income ? 'default' : 'destructive'}>{income ? 'Entrada' : 'Saída'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" aria-label="Ações">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => onEdit(t)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => onDelete(t)} className="text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
