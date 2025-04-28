'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, Edit, MoreVertical, Trash2, PlusCircle, CalendarRange } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { addCategory, loadCategories } from '@/lib/categories';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/notification';

export type RecurringTransaction = {
  id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saída';
  category?: string;
  note?: string;
  dayOfMonth: number; 
  active: boolean;  
};

type RecurringTransactionsProps = {
  onAddTransactions: (transactions: Transaction[]) => void;
  selectedMonth: number;
  selectedYear: number;
};

export default function RecurringTransactions({ 
  onAddTransactions, 
  selectedMonth, 
  selectedYear 
}: RecurringTransactionsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [editTransaction, setEditTransaction] = useState<RecurringTransaction | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [showNewCategory, setShowNewCategory] = useState<boolean>(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [futurePendingTransactions, setFuturePendingTransactions] = useState<Transaction[]>([]);

  const [transaction, setTransaction] = useState<Partial<RecurringTransaction>>({
    id: '',
    description: '',
    amount: 0,
    type: 'entrada' as const,
    category: '',
    note: '',
    dayOfMonth: 1,
    active: true,
  });

  useEffect(() => {
    const storedRecurring = localStorage.getItem('recurringTransactions');
    if (storedRecurring) {
      setRecurringTransactions(JSON.parse(storedRecurring));
    }
  }, []);

  useEffect(() => {
    if (recurringTransactions.length > 0) {
      localStorage.setItem('recurringTransactions', JSON.stringify(recurringTransactions));
    }
  }, [recurringTransactions]);

  useEffect(() => {
    const activeTransactions = recurringTransactions.filter(t => t.active);
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    
    const newPendingTransactions = activeTransactions.map(recTrans => {
      const day = Math.min(recTrans.dayOfMonth, daysInMonth);
      
      return {
        id: `pending-${recTrans.id}-${selectedMonth}-${selectedYear}`,
        date: new Date(selectedYear, selectedMonth, day),
        description: recTrans.description,
        amount: recTrans.amount,
        type: recTrans.type,
        category: recTrans.category,
        note: `[Automático] ${recTrans.note || ''}`,
        isRecurring: true,
        recurringId: recTrans.id
      } as Transaction;
    });
    
    setPendingTransactions(newPendingTransactions);
  }, [recurringTransactions, selectedMonth, selectedYear]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTransaction((prev) => ({
      ...prev,
      [name]: name === 'amount' || name === 'dayOfMonth' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setTransaction((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction.description || !transaction.amount || transaction.amount <= 0) {
      toast.error('Por favor, preencha a descrição e um valor válido.');
      return;
    }
    
    if (!transaction.dayOfMonth || transaction.dayOfMonth < 1 || transaction.dayOfMonth > 31) {
      toast.error('Por favor, informe um dia do mês válido (1-31).');
      return;
    }

    const finalTransaction: RecurringTransaction = {
      id: transaction.id || `rec-${Date.now()}`,
      description: transaction.description || '',
      amount: transaction.amount || 0,
      type: transaction.type as 'entrada' | 'saída',
      category: transaction.category || '',
      note: transaction.note || '',
      dayOfMonth: transaction.dayOfMonth || 1,
      active: transaction.active !== undefined ? transaction.active : true,
    };
    
    if (editTransaction) {

      setRecurringTransactions(prev => 
        prev.map(t => t.id === finalTransaction.id ? finalTransaction : t)
      );
    } else {

      setRecurringTransactions(prev => [...prev, finalTransaction]);
    }
    
    resetForm();
    playNotificationSound();
    toast.success("Transação adicionada", {
      description: `${transaction.description} foi adicionada com sucesso.`
    });
    setIsFormOpen(false);
  };

  const resetForm = () => {
    setTransaction({
      id: '',
      description: '',
      amount: 0,
      type: 'entrada',
      category: '',
      note: '',
      dayOfMonth: 1,
      active: true,
    });
    setEditTransaction(null);
  };

  const handleEdit = (transaction: RecurringTransaction) => {
    setEditTransaction(transaction);
    setTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação recorrente?')) {
      setRecurringTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleToggleActive = (id: string) => {
    setRecurringTransactions(prev => 
      prev.map(t => t.id === id ? { ...t, active: !t.active } : t)
    );
  };

  const handleApplyTransactions = () => {
    if (pendingTransactions.length > 0) {
      onAddTransactions(pendingTransactions);
      playNotificationSound();
      toast.success(`${pendingTransactions.length} transações aplicadas ao mês atual.`);
    } else {
      toast.error('Não há transações pendentes para aplicar.');
    }
  };

  const generateFutureTransactions = () => {
    const activeTransactions = recurringTransactions.filter(t => t.active);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const endYear = 2026;
    const endMonth = 11; 
    
    const allFutureTransactions: Transaction[] = [];
    
    for (let year = currentYear; year <= endYear; year++) {
      const startMonth = year === currentYear ? currentMonth : 0;
      const finalMonth = year === endYear ? endMonth : 11;
      
      for (let month = startMonth; month <= finalMonth; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        activeTransactions.forEach(recTrans => {
          const day = Math.min(recTrans.dayOfMonth, daysInMonth);
        
          allFutureTransactions.push({
            id: `pending-${recTrans.id}-${month}-${year}`,
            date: new Date(year, month, day),
            description: recTrans.description,
            amount: recTrans.amount,
            type: recTrans.type,
            category: recTrans.category,
            note: `[Automático] ${recTrans.note || ''}`,
            isRecurring: true,
            recurringId: recTrans.id
          } as Transaction);
        });
      }
    }
    
    return allFutureTransactions;
  };
  const prepareApplyFuture = () => {
    const futureTransactions = generateFutureTransactions();
    setFuturePendingTransactions(futureTransactions);
    setShowApplyConfirm(true);
  };

  const handleApplyFutureTransactions = () => {
    if (futurePendingTransactions.length > 0) {
      onAddTransactions(futurePendingTransactions);
      const months = new Set(futurePendingTransactions.map(t => 
        `${t.date.getMonth()}-${t.date.getFullYear()}`
      )).size;
      playNotificationSound();
      toast.success(`Transações recorrentes aplicadas com sucesso!`, {
        description: `${futurePendingTransactions.length} transações foram aplicadas em ${months} meses.`
      });
      setShowApplyConfirm(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  useEffect(() => {
    const loadedCategories = loadCategories();
    setCategories(loadedCategories);
  }, []);

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const updatedCategories = addCategory(newCategory.trim());
      setCategories(updatedCategories);
      handleSelectChange('category', newCategory.trim().toLowerCase());
      setNewCategory('');
      setShowNewCategory(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transações Recorrentes</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={prepareApplyFuture}
              disabled={pendingTransactions.length === 0}
              className="flex items-center gap-1"
            >
              <CalendarRange className="h-4 w-4" />
              Aplicar a Todos os Meses
            </Button>
            <Button 
              variant="outline" 
              onClick={handleApplyTransactions}
              disabled={pendingTransactions.length === 0}
              className="flex items-center gap-1"
            >
              <Calendar className="h-4 w-4" />
              Aplicar ao Mês Atual ({pendingTransactions.length})
            </Button>
            <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Nova Recorrente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recurringTransactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Dia do Mês</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringTransactions.map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>{rec.description}</TableCell>
                    <TableCell>Dia {rec.dayOfMonth}</TableCell>
                    <TableCell className={rec.type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(rec.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rec.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rec.active ? 'default' : 'secondary'}>
                        {rec.active ? 'Ativo' : 'Inativo'}
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
                          <DropdownMenuItem onClick={() => handleEdit(rec)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleActive(rec.id)}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {rec.active ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(rec.id)}
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
            <div className="text-center py-8 text-gray-500">
              <p>Você ainda não cadastrou transações recorrentes.</p>
              <p>Adicione suas despesas e receitas fixas para automatizar seu controle financeiro.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de transação recorrente */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setIsFormOpen(open);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editTransaction ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'}
            </DialogTitle>
            <DialogDescription>
              Cadastre um pagamento ou recebimento que se repete todos os meses.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={transaction.type}
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saída">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dayOfMonth">Dia do Mês</Label>
                <Input
                  id="dayOfMonth"
                  name="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  value={transaction.dayOfMonth || ''}
                  onChange={handleChange}
                  placeholder="Ex: 10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                name="description"
                value={transaction.description || ''}
                onChange={handleChange}
                placeholder="Ex: Aluguel, Salário, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={transaction.amount || ''}
                  onChange={handleChange}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                {showNewCategory ? (
                  <div className="flex space-x-2">
                    <Input
                      id="newCategory"
                      name="newCategory"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Nova categoria"
                    />
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={handleAddCategory}
                    >
                      +
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Select
                      value={transaction.category || ''}
                      onValueChange={(value) => handleSelectChange('category', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category.toLowerCase()}>
                            {category}
                          </SelectItem>
                        ))}
                        <div className="py-2 px-2 border-t">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="w-full flex items-center justify-center gap-1"
                            onClick={() => setShowNewCategory(true)}
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Adicionar categoria
                          </Button>
                        </div>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Observação</Label>
              <Textarea
                id="note"
                name="note"
                value={transaction.note || ''}
                onChange={handleChange}
                placeholder="Adicione uma observação (opcional)"
                className="resize-none"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editTransaction ? 'Atualizar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação para aplicar a todos os meses futuros */}
      <Dialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aplicar a Todos os Meses Futuros</DialogTitle>
            <DialogDescription>
              Esta ação irá aplicar todas as transações recorrentes ativas para todos os meses futuros, até dezembro de 2026.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="rounded-md bg-yellow-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Atenção</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Isso irá criar aproximadamente {futurePendingTransactions.length} transações. Este processo não pode ser desfeito facilmente.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Detalhes:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-500 mb-4 space-y-1">
              <li>Total de transações a serem criadas: {futurePendingTransactions.length}</li>
              <li>Total de meses: {new Set(futurePendingTransactions.map(t => 
                `${t.date.getMonth()}-${t.date.getFullYear()}`
              )).size}</li>
              <li>Período: De {new Date().toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'})} até Dezembro de 2026</li>
            </ul>

            <p className="text-sm text-gray-500">
              Deseja prosseguir com esta ação?
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyConfirm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyFutureTransactions}>
              Aplicar a Todos os Meses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}