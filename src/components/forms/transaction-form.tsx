'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Transaction } from '@/types/finance';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/notification';
import api from '@/lib/api';


type TransactionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  editTransaction?: Transaction | null;
  currentDate: Date;
};

function getInitialState(editTrans: Transaction | null | undefined, current: Date): Partial<Transaction> {
  if (editTrans) {
    return {
      ...editTrans,
      date: editTrans.date instanceof Date ? editTrans.date : new Date(editTrans.date),
    };
  }
  return {
    id: '',
    date: current,
    description: '',
    amount: 0,
    type: 'entrada' as const,
    category: '',
    note: '',
  };
}

function createLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TransactionForm({
  isOpen,
  onClose,
  onSave,
  editTransaction,
  currentDate,
}: TransactionFormProps) {
  const [transaction, setTransaction] = useState<Partial<Transaction>>(
    getInitialState(editTransaction, currentDate)
  );
  // Cada categoria tem id e name (vindo da API)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [showNewCategory, setShowNewCategory] = useState<boolean>(false);

  // Carrega categorias da API
  useEffect(() => {
    api.getCategories()
      .then((res) => setCategories(res.data.map((c: any) => ({ id: c._id, name: c.name }))))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTransaction(getInitialState(editTransaction, currentDate));
    }
  }, [editTransaction, currentDate, isOpen]);

  const isEditing = Boolean(editTransaction);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTransaction((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateString = e.target.value;
    if (dateString) {
      setTransaction((prev) => ({ ...prev, date: createLocalDate(dateString) }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setTransaction((prev) => ({ ...prev, [name]: value }));
  };

  // Cria nova categoria na API e adiciona à lista local
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const res = await api.createCategory({ name: newCategory.trim() });
      const created = { id: res.data._id, name: res.data.name };
      setCategories((prev) => [...prev, created]);
      handleSelectChange('category', created.id); // salva o ID como valor
      setNewCategory('');
      setShowNewCategory(false);
    } catch (err: any) {
      toast.error('Erro ao criar categoria', { description: err.message });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transaction.description || !transaction.amount || transaction.amount <= 0) {
      toast.error('Erro de validação', {
        description: 'Por favor, preencha a descrição e um valor válido.',
      });
      return;
    }

    if (!transaction.date) {
      toast.error('Erro de validação', { description: 'Por favor, selecione uma data válida.' });
      return;
    }

    const finalTransaction: Transaction = {
      id: transaction.id || `trans-${Date.now()}`,
      date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date || currentDate),
      description: transaction.description || '',
      amount: transaction.amount || 0,
      type: transaction.type as 'entrada' | 'saída',
      category: transaction.category || '',
      note: transaction.note,
    };

    onSave(finalTransaction);
    playNotificationSound();
    toast.success(isEditing ? 'Transação atualizada' : 'Transação adicionada', {
      description: `${transaction.description} foi ${isEditing ? 'atualizada' : 'adicionada'} com sucesso.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifique os detalhes da transação abaixo.'
              : 'Adicione uma nova entrada ou saída ao seu controle financeiro.'}
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
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={
                  transaction.date instanceof Date
                    ? formatDateForInput(transaction.date)
                    : formatDateForInput(new Date())
                }
                onChange={handleDateChange}
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
              placeholder="Ex: Salário, Conta de luz, etc."
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
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nova categoria"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  />
                  <Button type="button" size="sm" onClick={handleAddCategory}>+</Button>
                </div>
              ) : (
               <Select
  value={transaction.category || ''}
  onValueChange={(value) => handleSelectChange('category', value)}
>
  <SelectTrigger>
    <SelectValue placeholder="Selecione" />
  </SelectTrigger>
  <SelectContent position="popper" className="max-h-60 overflow-y-auto">
    {categories.map((cat) => (
      <SelectItem key={cat.id} value={cat.id}>
        {cat.name}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">{isEditing ? 'Atualizar' : 'Adicionar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}