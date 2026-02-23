'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, Edit, MoreVertical, Trash2, PlusCircle, CalendarRange, Loader2 } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/notification';
import api from '@/lib/api';

type ApiRecurring = {
  _id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saída';
  categoryName?: string;
  category?: string;
  note?: string;
  dayOfMonth: number;
  isActive: boolean;
  frequency: string;
};

type RecurringTransactionsProps = {
  onAddTransactions: (transactions: Transaction[]) => void;
  selectedMonth: number; // 0-11
  selectedYear: number;
};

const emptyForm = {
  description: '',
  amount: 0,
  type: 'saída' as 'entrada' | 'saída',
  category: '',
  note: '',
  dayOfMonth: 1,
};

export default function RecurringTransactions({
  onAddTransactions,
  selectedMonth,
  selectedYear,
}: RecurringTransactionsProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recurringList, setRecurringList] = useState<ApiRecurring[]>([]);
  const [editItem, setEditItem] = useState<ApiRecurring | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Carrega recorrentes e categorias da API
  useEffect(() => {
    setIsLoading(true);
    Promise.all([api.getRecurring(), api.getCategories()])
      .then(([recRes, catRes]) => {
        setRecurringList(recRes.data);
        setCategories(catRes.data.map((c: any) => ({ id: c._id, name: c.name })));
      })
      .catch((err) => toast.error('Erro ao carregar dados: ' + err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'amount' || name === 'dayOfMonth' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const res = await api.createCategory({ name: newCategory.trim() });
      const created = { id: res.data._id, name: res.data.name };
      setCategories((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, category: created.id }));
      setNewCategory('');
      setShowNewCategory(false);
    } catch (err: any) {
      toast.error('Erro ao criar categoria: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount || form.amount <= 0) {
      toast.error('Preencha a descrição e um valor válido.');
      return;
    }
    if (!form.dayOfMonth || form.dayOfMonth < 1 || form.dayOfMonth > 31) {
      toast.error('Informe um dia do mês válido (1-31).');
      return;
    }

    const today = new Date();
    const payload = {
      description: form.description,
      amount: form.amount,
      type: form.type,
      category: form.category || undefined,
      note: form.note || undefined,
      frequency: 'monthly' as const,
      dayOfMonth: form.dayOfMonth,
      isActive: true,
      startDate: today.toISOString().split('T')[0],
    };

    try {
      if (editItem) {
        const res = await api.updateRecurring(editItem._id, payload);
        setRecurringList((prev) => prev.map((r) => r._id === editItem._id ? res.data : r));
        toast.success('Transação recorrente atualizada.');
      } else {
        const res = await api.createRecurring(payload);
        setRecurringList((prev) => [...prev, res.data]);
        toast.success('Transação recorrente criada.');
      }
      playNotificationSound();
      resetForm();
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditItem(null);
    setShowNewCategory(false);
  };

  const handleEdit = (item: ApiRecurring) => {
    setEditItem(item);
    setForm({
      description: item.description,
      amount: item.amount,
      type: item.type,
      category: item.category || '',
      note: item.note || '',
      dayOfMonth: item.dayOfMonth,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação recorrente?')) return;
    try {
      await api.deleteRecurring(id);
      setRecurringList((prev) => prev.filter((r) => r._id !== id));
      toast.success('Transação recorrente removida.');
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message);
    }
  };

  const handleToggleActive = async (item: ApiRecurring) => {
    try {
      const res = await api.updateRecurring(item._id, { isActive: !item.isActive });
      setRecurringList((prev) => prev.map((r) => r._id === item._id ? res.data : r));
    } catch (err: any) {
      toast.error('Erro ao atualizar status: ' + err.message);
    }
  };

  // Aplica todas as recorrentes ativas ao mês selecionado
  const handleApplyToMonth = async () => {
    const active = recurringList.filter((r) => r.isActive);
    if (active.length === 0) {
      toast.error('Não há transações recorrentes ativas.');
      return;
    }

    setIsApplying(true);
    const apiMonth = selectedMonth + 1; // API usa 1-12

    try {
      await Promise.all(
        active.map((r) => api.applyRecurringToMonth(r._id, selectedYear, apiMonth))
      );
      playNotificationSound();
      toast.success(`Recorrentes aplicadas ao mês ${apiMonth}/${selectedYear}.`);
      onAddTransactions([]); // sinaliza para o HomePage recarregar o mês
    } catch (err: any) {
      toast.error('Erro ao aplicar recorrentes: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  // Aplica a todos os meses futuros até dez/2026
  const handleApplyAllMonths = async () => {
    const active = recurringList.filter((r) => r.isActive);
    if (active.length === 0) {
      toast.error('Não há transações recorrentes ativas.');
      return;
    }

    setIsApplying(true);
    setShowApplyConfirm(false);

    const now = new Date();
    const months: { year: number; month: number }[] = [];

    for (let y = now.getFullYear(); y <= 2026; y++) {
      const start = y === now.getFullYear() ? now.getMonth() + 1 : 1;
      const end = y === 2026 ? 12 : 12;
      for (let m = start; m <= end; m++) {
        months.push({ year: y, month: m });
      }
    }

    let applied = 0;
    try {
      for (const { year, month } of months) {
        await Promise.all(active.map((r) => api.applyRecurringToMonth(r._id, year, month)));
        applied++;
      }
      playNotificationSound();
      toast.success(`Recorrentes aplicadas em ${applied} meses.`);
      onAddTransactions([]);
    } catch (err: any) {
      toast.error('Erro ao aplicar: ' + err.message);
    } finally {
      setIsApplying(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const activeCount = recurringList.filter((r) => r.isActive).length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transações Recorrentes</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowApplyConfirm(true)}
              disabled={activeCount === 0 || isApplying}
              className="flex items-center gap-1"
            >
              <CalendarRange className="h-4 w-4" />
              Aplicar a Todos os Meses
            </Button>
            <Button
              variant="outline"
              onClick={handleApplyToMonth}
              disabled={activeCount === 0 || isApplying}
              className="flex items-center gap-1"
            >
              {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Aplicar ao Mês Atual ({activeCount})
            </Button>
            <Button onClick={() => setIsFormOpen(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Nova Recorrente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recurringList.length > 0 ? (
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
                {recurringList.map((rec) => (
                  <TableRow key={rec._id}>
                    <TableCell>{rec.description}</TableCell>
                    <TableCell>Dia {rec.dayOfMonth}</TableCell>
                    <TableCell className={rec.type === 'entrada' ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(rec.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rec.categoryName || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rec.isActive ? 'default' : 'secondary'}>
                        {rec.isActive ? 'Ativo' : 'Inativo'}
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
                            <Edit className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(rec)}>
                            <Calendar className="mr-2 h-4 w-4" />
                            {rec.isActive ? 'Desativar' : 'Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(rec._id)} className="text-red-600">
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
            <div className="text-center py-8 text-gray-500">
              <p>Você ainda não cadastrou transações recorrentes.</p>
              <p>Adicione suas despesas e receitas fixas para automatizar seu controle financeiro.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsFormOpen(open); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Editar Transação Recorrente' : 'Nova Transação Recorrente'}</DialogTitle>
            <DialogDescription>Cadastre um pagamento ou recebimento que se repete todo mês.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => handleSelectChange('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saída">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dia do Mês</Label>
                <Input name="dayOfMonth" type="number" min="1" max="31"
                  value={form.dayOfMonth || ''} onChange={handleChange} placeholder="Ex: 10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input name="description" value={form.description} onChange={handleChange}
                placeholder="Ex: Aluguel, Salário, etc." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input name="amount" type="number" step="0.01" min="0"
                  value={form.amount || ''} onChange={handleChange} placeholder="0,00" />
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
                  <Select value={form.category} onValueChange={(v) => handleSelectChange('category', v)}>
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

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea name="note" value={form.note} onChange={handleChange}
                placeholder="Adicione uma observação (opcional)" className="resize-none" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setIsFormOpen(false); }}>
                Cancelar
              </Button>
              <Button type="submit">{editItem ? 'Atualizar' : 'Adicionar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação aplicar todos os meses */}
      <Dialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Aplicar a Todos os Meses Futuros</DialogTitle>
            <DialogDescription>
              Isso irá aplicar todas as recorrentes ativas de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} até dezembro de 2026.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground space-y-2">
            <p>Recorrentes ativas: <strong>{activeCount}</strong></p>
            <p>Esta operação pode levar alguns segundos.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyConfirm(false)}>Cancelar</Button>
            <Button onClick={handleApplyAllMonths} disabled={isApplying}>
              {isApplying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aplicar a Todos os Meses
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}