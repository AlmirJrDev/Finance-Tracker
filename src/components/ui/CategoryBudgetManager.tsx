'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CircleAlert, Edit, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useBudgetMutations, useBudgets, useCategories } from '@/hooks/use-finance';
import { monthLabel } from '@/lib/dates';
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money';
import type { BudgetStatus, Category } from '@/types/finance';

// Formatos antigos guardados no navegador (Fase 1 e antes)
const LOCAL_KEYS = { v2: 'categoryBudgets:v2', legacy: 'categoryBudgetLimits' };

function readLocalBudgets(categories: Category[]): { categoryId: string; amountCents: number }[] {
  try {
    const v2 = localStorage.getItem(LOCAL_KEYS.v2);
    if (v2) {
      return (JSON.parse(v2) as { categoryId: string; limitCents: number }[]).map((b) => ({
        categoryId: b.categoryId,
        amountCents: b.limitCents,
      }));
    }
    const legacy = localStorage.getItem(LOCAL_KEYS.legacy);
    if (!legacy) return [];
    const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    return (JSON.parse(legacy) as { category: string; limit: number }[])
      .map((b) => ({ categoryId: byName.get(b.category.toLowerCase()) ?? '', amountCents: Math.round(b.limit * 100) }))
      .filter((b) => b.categoryId && b.amountCents > 0);
  } catch {
    return [];
  }
}

function LevelIcon({ budget }: { budget: BudgetStatus }) {
  if (budget.level === 'exceeded') return <CircleAlert className="inline ml-2 h-4 w-4 text-red-600" aria-label="Limite estourado" />;
  if (budget.level === 'warning') return <AlertTriangle className="inline ml-2 h-4 w-4 text-amber-600" aria-label="Perto do limite" />;
  return null;
}

export default function CategoryBudgetManager({ month }: { month: string }) {
  const { data: categories = [] } = useCategories();
  const { data: budgets, isLoading } = useBudgets(month);
  const { save, remove } = useBudgetMutations();
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [alertPercent, setAlertPercent] = useState('80');
  const [editing, setEditing] = useState(false);

  // Importa uma única vez os limites que estavam salvos só neste navegador
  const imported = useRef(false);
  useEffect(() => {
    if (imported.current || !budgets || categories.length === 0) return;
    imported.current = true;
    const local = readLocalBudgets(categories).filter((l) => categories.some((c) => c.id === l.categoryId));
    if (local.length === 0) return;
    if (budgets.length > 0) {
      localStorage.removeItem(LOCAL_KEYS.v2);
      localStorage.removeItem(LOCAL_KEYS.legacy);
      return;
    }
    (async () => {
      for (const b of local) await save.mutateAsync(b);
      localStorage.removeItem(LOCAL_KEYS.v2);
      localStorage.removeItem(LOCAL_KEYS.legacy);
      toast.success(`${local.length} limite(s) deste navegador agora estão salvos na sua conta.`);
    })().catch((err) => toast.error('Não foi possível importar os limites salvos', { description: err.message }));
  }, [budgets, categories, save]);

  const resetForm = () => {
    setCategoryId('');
    setLimit('');
    setAlertPercent('80');
    setEditing(false);
  };

  const handleSave = async () => {
    const amountCents = parseAmountToCents(limit);
    const percent = Number(alertPercent);
    if (!categoryId || !amountCents) {
      toast.error('Selecione uma categoria e informe um valor válido.');
      return;
    }
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      toast.error('O alerta deve ser um percentual entre 1 e 100.');
      return;
    }
    try {
      await save.mutateAsync({ categoryId, amountCents, alertPercent: percent });
      toast.success(editing ? 'Limite atualizado.' : 'Limite criado.');
      resetForm();
    } catch (err) {
      toast.error('Erro ao salvar limite', { description: (err as Error).message });
    }
  };

  const list = budgets ?? [];
  const available = editing ? categories : categories.filter((c) => !list.some((b) => b.categoryId === c.id));

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle>Limites de Gastos por Categoria</CardTitle>
        <CardDescription>
          Limite mensal por categoria, acompanhado em {monthLabel(month)}. Conta o que já foi pago e o que está previsto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mb-6 md:flex-row">
          <select
            aria-label="Categoria"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            value={categoryId}
            disabled={editing}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Selecione uma categoria</option>
            {available.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <Input
            inputMode="decimal"
            placeholder="Limite (ex.: 800,00)"
            aria-label="Valor limite"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-full"
          />

          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={100}
              aria-label="Alertar a partir de (%)"
              title="Alertar a partir de (%)"
              value={alertPercent}
              onChange={(e) => setAlertPercent(e.target.value)}
              className="w-20"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">% alerta</span>
          </div>

          <Button onClick={handleSave} disabled={save.isPending} className="flex items-center gap-1 whitespace-nowrap">
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            {editing ? 'Atualizar' : 'Adicionar'} Limite
          </Button>

          {editing && (
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead>Gasto</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((budget) => (
                <TableRow key={budget.categoryId}>
                  <TableCell>
                    {budget.category.icon} {budget.category.name}
                  </TableCell>
                  <TableCell>{formatCents(budget.amountCents)}</TableCell>
                  <TableCell className={budget.level === 'exceeded' ? 'text-red-600 font-bold' : ''}>
                    {formatCents(budget.totalCents)}
                    <LevelIcon budget={budget} />
                    {budget.pendingCents > 0 && (
                      <p className="text-xs font-normal text-muted-foreground">{formatCents(budget.pendingCents)} previsto</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(budget.percent, 100)}
                        className={`w-full ${budget.level === 'exceeded' ? 'bg-red-200' : budget.level === 'warning' ? 'bg-amber-200' : 'bg-slate-200'}`}
                      />
                      <span className="text-xs whitespace-nowrap">{budget.percent}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar limite de ${budget.category.name}`}
                        onClick={() => {
                          setCategoryId(budget.categoryId);
                          setLimit(centsToInput(budget.amountCents));
                          setAlertPercent(String(budget.alertPercent));
                          setEditing(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover limite de ${budget.category.name}`}
                        className="text-red-600"
                        onClick={async () => {
                          if (!confirm(`Remover o limite de "${budget.category.name}"?`)) return;
                          try {
                            await remove.mutateAsync(budget.categoryId);
                          } catch (err) {
                            toast.error('Erro ao remover', { description: (err as Error).message });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum limite definido. Adicione seu primeiro limite acima.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
