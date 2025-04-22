'use client';

import { Fragment, useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Edit, MoreVertical, Trash2 } from 'lucide-react';
import { DailyBalance, Transaction } from '@/types/finance';

interface TransactionsTableProps {
  dailyBalances: DailyBalance[];
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transactionId: string, date: Date) => void;
}

export function TransactionsTable({ 
  dailyBalances, 
  onEditTransaction, 
  onDeleteTransaction 
}: TransactionsTableProps) {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  const toggleDay = (day: number) => {
    if (expandedDay === day) {
      setExpandedDay(null);
    } else {
      setExpandedDay(day);
    }
  };

  // Ensure all dates are proper Date objects
  const processedBalances = dailyBalances.map(day => ({
    ...day,
    date: day.date instanceof Date ? day.date : new Date(day.date)
  }));

  // Filtra apenas dias com transações
  const daysWithTransactions = processedBalances.filter(
    day => day.dailyTransactions.length > 0 || day.income > 0 || day.expense > 0
  );
  
  // Ordena por data (mais recente primeiro)
  daysWithTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimentações do Mês</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Entradas</TableHead>
              <TableHead>Saídas</TableHead>
              <TableHead>Saldo Diário</TableHead>
              <TableHead>Saldo Acumulado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {daysWithTransactions.length > 0 ? (
            daysWithTransactions.map((day) => (
              <Fragment key={day.date.getTime()}>
                <TableRow 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleDay(day.date.getDate())}
                >
                  <TableCell>{formatDate(day.date)}</TableCell>
                  <TableCell className="text-green-600">{day.income > 0 ? formatCurrency(day.income) : '-'}</TableCell>
                  <TableCell className="text-red-600">{day.expense > 0 ? formatCurrency(day.expense) : '-'}</TableCell>
                  <TableCell>{formatCurrency(day.income - day.expense)}</TableCell>
                  <TableCell className={day.balance < 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>{formatCurrency(day.balance)}</TableCell>
                </TableRow>
                
                {expandedDay === day.date.getDate() && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0 bg-gray-50">
                      <div className="p-4">
                        <h4 className="text-sm font-medium mb-2">Transações do dia</h4>
                        
                        {day.dailyTransactions.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {day.dailyTransactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                  <TableCell>{transaction.description}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{transaction.category}</Badge>
                                  </TableCell>
                                  <TableCell className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                                    {formatCurrency(transaction.amount)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                                      {transaction.type === 'income' ? 'Entrada' : 'Saída'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEditTransaction(transaction)}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => onDeleteTransaction(transaction.id, day.date)}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-gray-500">Não há transações detalhadas para este dia.</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6">
                Nenhuma transação registrada para este mês.
              </TableCell>
            </TableRow>
          )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}