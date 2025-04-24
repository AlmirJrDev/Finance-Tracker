'use client';

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
import { Switch } from '@/components/ui/switch';
import { RecurringTransaction, RecurrenceFrequency } from '@/types/finance';
import { loadCategories, addCategory } from '@/lib/categories';
import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';

type RecurringTransactionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: RecurringTransaction) => void;
  editTransaction?: RecurringTransaction | null;
};

export default function RecurringTransactionForm({
  isOpen,
  onClose,
  onSave,
  editTransaction,
}: RecurringTransactionFormProps) {
  const [transaction, setTransaction] = useState<Partial<RecurringTransaction>>(
    editTransaction || {
      id: '',
      description: '',
      amount: 0,
      type: 'entrada' as const,
      category: '',
      note: '',
      frequency: 'monthly' as RecurrenceFrequency,
      dayOfMonth: new Date().getDate(),
      isActive: true,
      startDate: new Date(),
    }
  );

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [showNewCategory, setShowNewCategory] = useState<boolean>(true);

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

  const handleDateChange = (name: string, value: string) => {
    setTransaction((prev) => ({
      ...prev,
      [name]: new Date(value),
    }));
  };

  const handleNumberChange = (name: string, value: string) => {
    setTransaction((prev) => ({
      ...prev,
      [name]: parseInt(value, 10) || 0,
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setTransaction((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
      
    // Validação básica
    if (!transaction.description || !transaction.amount || transaction.amount <= 0) {
      alert('Por favor, preencha a descrição e um valor válido.');
      return;
    }

    if (transaction.frequency === 'monthly' && (!transaction.dayOfMonth || transaction.dayOfMonth < 1 || transaction.dayOfMonth > 31)) {
      alert('Por favor, selecione um dia do mês válido (1-31).');
      return;
    }

    if (transaction.frequency === 'weekly' && (transaction.dayOfWeek === undefined || transaction.dayOfWeek < 0 || transaction.dayOfWeek > 6)) {
      alert('Por favor, selecione um dia da semana válido.');
      return;
    }
      
    // Formata a transação final
    const finalTransaction: RecurringTransaction = {
      id: transaction.id || `rec-trans-${Date.now()}`,
      description: transaction.description || '',
      amount: transaction.amount!,
      type: transaction.type as 'entrada' | 'saída',
      category: transaction.category || '',
      note: transaction.note,
      frequency: transaction.frequency as RecurrenceFrequency,
      dayOfMonth: transaction.frequency === 'monthly' ? transaction.dayOfMonth : undefined,
      dayOfWeek: transaction.frequency === 'weekly' ? transaction.dayOfWeek : undefined,
      isActive: transaction.isActive === undefined ? true : transaction.isActive,
      startDate: transaction.startDate || new Date(),
      endDate: transaction.endDate,
    };
      
    onSave(finalTransaction);
    onClose();
  };

  const handleCancel = () => {
    setTransaction(
      editTransaction || {
        id: '',
        description: '',
        amount: 0,
        type: 'entrada' as const,
        category: '',
        note: '',
        frequency: 'monthly' as RecurrenceFrequency,
        dayOfMonth: new Date().getDate(),
        isActive: true,
        startDate: new Date(),
      }
    );
    onClose();
  };



  const weekDays = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  // No useEffect inicial, adicione:
useEffect(() => {
  const loadedCategories = loadCategories();
  setCategories(loadedCategories);
}, []);

// Adicione esta função para adicionar categorias personalizadas
const handleAddCategory = () => {
  if (newCategory.trim()) {
    const updatedCategories = addCategory(newCategory.trim());
    setCategories(updatedCategories);
    handleSelectChange('category', newCategory.trim().toLowerCase());
    setNewCategory('');
    setShowNewCategory(false);
  }
};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'}</DialogTitle>
          <DialogDescription>
            Configure uma transação que se repetirá automaticamente conforme a frequência escolhida.
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
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                value={transaction.frequency}
                onValueChange={(value) => handleSelectChange('frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="daily">Diária</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              value={transaction.description}
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

          {transaction.frequency === 'monthly' && (
            <div className="space-y-2">
              <Label htmlFor="dayOfMonth">Dia do mês</Label>
              <Select
                value={(transaction.dayOfMonth || 1).toString()}
                onValueChange={(value) => handleNumberChange('dayOfMonth', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {transaction.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Dia da semana</Label>
              <Select
                value={(transaction.dayOfWeek || 0).toString()}
                onValueChange={(value) => handleNumberChange('dayOfWeek', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {weekDays.map((day, index) => (
                    <SelectItem key={day} value={index.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de início</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={
                  transaction.startDate instanceof Date
                    ? transaction.startDate.toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]
                }
                onChange={(e) => handleDateChange('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data de término (opcional)</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={
                  transaction.endDate instanceof Date
                    ? transaction.endDate.toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) => handleDateChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={transaction.isActive === undefined ? true : transaction.isActive}
              onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
            />
            <Label htmlFor="isActive">Ativo</Label>
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
