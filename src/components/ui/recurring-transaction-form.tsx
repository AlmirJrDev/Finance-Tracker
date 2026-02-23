'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RecurringTransaction, RecurrenceFrequency } from '@/types/finance';
import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';


type RecurringTransactionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: RecurringTransaction) => void;
  editTransaction?: RecurringTransaction | null;
};

const defaultForm = (): Partial<RecurringTransaction> => ({
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
});

const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export default function RecurringTransactionForm({
  isOpen,
  onClose,
  onSave,
  editTransaction,
}: RecurringTransactionFormProps) {
  const [transaction, setTransaction] = useState<Partial<RecurringTransaction>>(
    editTransaction || defaultForm()
  );
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);

  const isEditing = Boolean(editTransaction);

  // Carrega categorias da API
  useEffect(() => {
    api.getCategories()
      .then((res) => setCategories(res.data.map((c: any) => ({ id: c._id, name: c.name }))))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTransaction(editTransaction || defaultForm());
    }
  }, [isOpen, editTransaction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTransaction((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setTransaction((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string, value: string) => {
    setTransaction((prev) => ({ ...prev, [name]: new Date(value) }));
  };

  const handleNumberChange = (name: string, value: string) => {
    setTransaction((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setTransaction((prev) => ({ ...prev, [name]: checked }));
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const res = await api.createCategory({ name: newCategory.trim() });
      const created = { id: res.data._id, name: res.data.name };
      setCategories((prev) => [...prev, created]);
      handleSelectChange('category', created.id);
      setNewCategory('');
      setShowNewCategory(false);
    } catch (err: any) {
      toast.error('Erro ao criar categoria: ' + err.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transaction.description || !transaction.amount || transaction.amount <= 0) {
      toast.error('Por favor, preencha a descrição e um valor válido.');
      return;
    }

    if (transaction.frequency === 'monthly' && (!transaction.dayOfMonth || transaction.dayOfMonth < 1 || transaction.dayOfMonth > 31)) {
      toast.error('Por favor, selecione um dia do mês válido (1-31).');
      return;
    }

    if (transaction.frequency === 'weekly' && (transaction.dayOfWeek === undefined || transaction.dayOfWeek < 0 || transaction.dayOfWeek > 6)) {
      toast.error('Por favor, selecione um dia da semana válido.');
      return;
    }

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
    setTransaction(editTransaction || defaultForm());
    onClose();
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
              <Label>Tipo</Label>
              <Select value={transaction.type} onValueChange={(v) => handleSelectChange('type', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saída">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={transaction.frequency} onValueChange={(v) => handleSelectChange('frequency', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a frequência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="daily">Diária</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input name="description" value={transaction.description} onChange={handleChange}
              placeholder="Ex: Salário, Conta de luz, etc." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input name="amount" type="number" step="0.01" min="0"
                value={transaction.amount || ''} onChange={handleChange} placeholder="0,00" />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              {showNewCategory ? (
                <div className="flex space-x-2">
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nova categoria"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())} />
                  <Button type="button" size="sm" onClick={handleAddCategory}>+</Button>
                </div>
              ) : (
                <Select value={transaction.category || ''} onValueChange={(v) => handleSelectChange('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                    <div className="py-2 px-2 border-t">
                      <Button type="button" variant="ghost" size="sm"
                        className="w-full flex items-center justify-center gap-1"
                        onClick={() => setShowNewCategory(true)}>
                        <PlusCircle className="h-4 w-4 mr-1" /> Adicionar categoria
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {transaction.frequency === 'monthly' && (
            <div className="space-y-2">
              <Label>Dia do mês</Label>
              <Select value={(transaction.dayOfMonth || 1).toString()}
                onValueChange={(v) => handleNumberChange('dayOfMonth', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o dia" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {transaction.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <Select value={(transaction.dayOfWeek || 0).toString()}
                onValueChange={(v) => handleNumberChange('dayOfWeek', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o dia" /></SelectTrigger>
                <SelectContent>
                  {weekDays.map((day, index) => (
                    <SelectItem key={day} value={index.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de início</Label>
              <Input type="date"
                value={transaction.startDate instanceof Date
                  ? transaction.startDate.toISOString().split('T')[0]
                  : new Date().toISOString().split('T')[0]}
                onChange={(e) => handleDateChange('startDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data de término (opcional)</Label>
              <Input type="date"
                value={transaction.endDate instanceof Date
                  ? transaction.endDate.toISOString().split('T')[0] : ''}
                onChange={(e) => handleDateChange('endDate', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="isActive"
              checked={transaction.isActive === undefined ? true : transaction.isActive}
              onCheckedChange={(checked) => handleSwitchChange('isActive', checked)} />
            <Label htmlFor="isActive">Ativo</Label>
          </div>

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea name="note" value={transaction.note || ''} onChange={handleChange}
              placeholder="Adicione uma observação (opcional)" className="resize-none" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button type="submit">{isEditing ? 'Atualizar' : 'Adicionar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}