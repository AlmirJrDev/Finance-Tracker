'use client';

import { useState } from 'react';
import { AlertCircle, Edit, PlusCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useCategories } from '@/hooks/use-finance';
import { centsToInput, formatCents, parseAmountToCents } from '@/lib/money';
import type { Category, MonthSummary } from '@/types/finance';

// Ainda salvo no navegador. Na Fase 2 os orçamentos vão para a API.
type Budget = { categoryId: string; limitCents: number };

const STORAGE_KEY = 'categoryBudgets:v2';
const LEGACY_KEY = 'categoryBudgetLimits'; // [{ category: nome, limit: reais }]

function loadBudgets(categories: Category[]): Budget[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);

    // Converte o formato antigo (por nome) para o novo (por ID), sem perder o que já existia
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return [];
    const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const migrated = (JSON.parse(legacy) as { category: string; limit: number }[])
      .map((b) => ({ categoryId: byName.get(b.category.toLowerCase()), limitCents: Math.round(b.limit * 100) }))
      .filter((b): b is Budget => Boolean(b.categoryId));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}

export default function CategoryBudgetManager({ summary }: { summary: MonthSummary }) {
  const { data: categories = [] } = useCategories();
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [editing, setEditing] = useState(false);

  // Carrega uma vez, assim que as categorias chegarem (necessárias para converter o formato antigo)
  if (budgets === null && categories.length > 0) setBudgets(loadBudgets(categories));

  const persist = (next: Budget[]) => {
    setBudgets(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const spentBy = new Map(summary.byCategory.map((c) => [c.categoryId, c.expenseCents]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const list = (budgets ?? []).filter((b) => categoryById.has(b.categoryId));

  const handleSave = () => {
    const limitCents = parseAmountToCents(limit);
    if (!categoryId || !limitCents) {
      toast.error('Selecione uma categoria e informe um valor válido.');
      return;
    }
    persist([...list.filter((b) => b.categoryId !== categoryId), { categoryId, limitCents }]);
    resetForm();
  };

  const resetForm = () => {
    setCategoryId('');
    setLimit('');
    setEditing(false);
  };

  const available = editing ? categories : categories.filter((c) => !list.some((b) => b.categoryId === c.id));

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle>Limites de Gastos por Categoria</CardTitle>
        <CardDescription>Defina limites mensais para suas categorias de despesas</CardDescription>
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

          <Button onClick={handleSave} className="flex items-center gap-1 whitespace-nowrap">
            <PlusCircle className="h-4 w-4" />
            {editing ? 'Atualizar' : 'Adicionar'} Limite
          </Button>

          {editing && (
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>

        {list.length > 0 ? (
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
              {list.map((budget) => {
                const category = categoryById.get(budget.categoryId)!;
                const spent = spentBy.get(budget.categoryId) ?? 0;
                const progress = Math.min((spent / budget.limitCents) * 100, 100);
                const over = spent > budget.limitCents;

                return (
                  <TableRow key={budget.categoryId}>
                    <TableCell>
                      {category.icon} {category.name}
                    </TableCell>
                    <TableCell>{formatCents(budget.limitCents)}</TableCell>
                    <TableCell className={over ? 'text-red-500 font-bold' : ''}>
                      {formatCents(spent)}
                      {over && <AlertCircle className="inline ml-2 h-4 w-4" aria-label="Acima do limite" />}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className={`w-full ${over ? 'bg-red-200' : 'bg-slate-200'}`} />
                        <span className="text-xs whitespace-nowrap">{Math.round((spent / budget.limitCents) * 100)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar limite"
                          onClick={() => {
                            setCategoryId(budget.categoryId);
                            setLimit(centsToInput(budget.limitCents));
                            setEditing(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remover limite"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm(`Remover o limite de "${category.name}"?`)) {
                              persist(list.filter((b) => b.categoryId !== budget.categoryId));
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
