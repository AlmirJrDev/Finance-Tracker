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

type TransactionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  editTransaction?: Transaction | null;
  currentDate: Date;
};

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

  // Este useEffect atualiza o estado do formulário quando editTransaction muda
  useEffect(() => {
    if (isOpen) {
      setTransaction(getInitialState(editTransaction, currentDate));
    }
  }, [editTransaction, currentDate, isOpen]);

  // Função para obter o estado inicial com base no editTransaction ou valores padrão
  function getInitialState(editTrans: Transaction | null | undefined, current: Date): Partial<Transaction> {
    if (editTrans) {
      return {
        ...editTrans,
        // Garantir que a data seja um objeto Date
        date: editTrans.date instanceof Date ? editTrans.date : new Date(editTrans.date)
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

  const isEditing = Boolean(editTransaction);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setTransaction((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
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
      
    // Validação básica
    if (!transaction.description || !transaction.amount || transaction.amount <= 0) {
      alert('Por favor, preencha a descrição e um valor válido.');
      return;
    }
      
    // Formata a transação final
    const finalTransaction: Transaction = {
      id: transaction.id || `trans-${Date.now()}`,
      date: transaction.date || currentDate,
      description: transaction.description || '',
      amount: transaction.amount || 0,
      type: transaction.type as 'entrada' | 'saída',
      category: transaction.category || '',
      note: transaction.note,
    };
      
    onSave(finalTransaction);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const categories = [
    'Salário',
    'Aluguel',
    'Alimentação',
    'Transporte',
    'Educação',
    'Saúde',
    'Lazer',
    'Outros',
  ];

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
                    ? transaction.date.toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]
                }
                onChange={(e) =>
                  handleChange({
                    ...e,
                    target: {
                      ...e.target,
                      name: 'date',
                      value: new Date(e.target.value),
                    },
                  } as any)
                }
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
                </SelectContent>
              </Select>
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
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Atualizar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}