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
import { loadCategories, addCategory } from '@/lib/categories';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner'; 

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
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [showNewCategory, setShowNewCategory] = useState<boolean>(false);

  // Carrega categorias ao iniciar
  useEffect(() => {
    const loadedCategories = loadCategories();
    setCategories(loadedCategories);
  }, []);

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
  
  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const updatedCategories = addCategory(newCategory.trim());
      setCategories(updatedCategories);
      handleSelectChange('category', newCategory.trim().toLowerCase());
      setNewCategory('');
      setShowNewCategory(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
      
    // Validação básica
    if (!transaction.description || !transaction.amount || transaction.amount <= 0) {
      toast.error("Erro de validação", {
        description: "Por favor, preencha a descrição e um valor válido."
      });
      return;
    }
      
    // Formata a transação final - certifique-se que a data seja um objeto Date válido
    const finalTransaction: Transaction = {
      id: transaction.id || `trans-${Date.now()}`,
      date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date || currentDate),
      description: transaction.description || '',
      amount: transaction.amount || 0,
      type: transaction.type as 'entrada' | 'saída',
      category: (transaction.category || '').toLowerCase(), // Normalizar categoria para lowercase
      note: transaction.note,
    };
      
    onSave(finalTransaction);
    toast.success(isEditing ? "Transação atualizada" : "Transação adicionada", {
      description: `${transaction.description} foi ${isEditing ? 'atualizada' : 'adicionada'} com sucesso.`
    });
    onClose();
  };

  const handleCancel = () => {
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