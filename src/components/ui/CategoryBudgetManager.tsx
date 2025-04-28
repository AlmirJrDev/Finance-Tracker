'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Edit, Trash2, PlusCircle } from 'lucide-react';
import { loadCategories } from '@/lib/categories';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MonthlyData } from '@/types/finance';

interface CategoryBudget {
  category: string;
  limit: number;
}

const loadBudgetLimits = (): CategoryBudget[] => {
  const stored = localStorage.getItem('categoryBudgetLimits');
  return stored ? JSON.parse(stored) : [];
};

const saveBudgetLimits = (limits: CategoryBudget[]) => {
  localStorage.setItem('categoryBudgetLimits', JSON.stringify(limits));
};

interface CategoryBudgetManagerProps {
  data: MonthlyData;
  allMonthsData: MonthlyData[];
}

export default function CategoryBudgetManager({ data }: CategoryBudgetManagerProps) {
  const [budgetLimits, setBudgetLimits] = useState<CategoryBudget[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [budgetLimit, setBudgetLimit] = useState<string>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [categorySpending, setCategorySpending] = useState<Record<string, number>>({});

  useEffect(() => {
    setBudgetLimits(loadBudgetLimits());
    setAvailableCategories(loadCategories());
  }, []);

  useEffect(() => {
    if (!data) return;
    
    const spending: Record<string, number> = {};
    
    data.dailyBalances.forEach(day => {
      day.dailyTransactions.forEach(transaction => {
        if (transaction.type === 'saída' && transaction.category) {
          const normalizedCategory = transaction.category.toLowerCase();
          if (!spending[normalizedCategory]) {
            spending[normalizedCategory] = 0;
          }
          spending[normalizedCategory] += transaction.amount;
        }
      });
    });
    
    console.log('Gastos por categoria calculados:', spending);
    setCategorySpending(spending);
  }, [data]);

  const handleSaveBudget = () => {
    if (!selectedCategory || !budgetLimit || isNaN(Number(budgetLimit)) || Number(budgetLimit) <= 0) {
      alert('Por favor, selecione uma categoria e insira um valor válido.');
      return;
    }

    const existingIndex = budgetLimits.findIndex(item => item.category === selectedCategory);
    
    let newLimits: CategoryBudget[];
    
    if (isEditing !== null) {
      newLimits = [...budgetLimits];
      newLimits[isEditing] = {
        category: selectedCategory,
        limit: Number(budgetLimit)
      };
    } else if (existingIndex >= 0) {

      if (!confirm(`Já existe um limite para a categoria "${selectedCategory}". Deseja atualizá-lo?`)) {
        return;
      }
      newLimits = [...budgetLimits];
      newLimits[existingIndex].limit = Number(budgetLimit);
    } else {
      newLimits = [
        ...budgetLimits,
        {
          category: selectedCategory,
          limit: Number(budgetLimit)
        }
      ];
    }
    
    setBudgetLimits(newLimits);
    saveBudgetLimits(newLimits);
    resetForm();
  };

  const handleEdit = (index: number) => {
    const budget = budgetLimits[index];
    setSelectedCategory(budget.category);
    setBudgetLimit(budget.limit.toString());
    setIsEditing(index);
  };

  const handleDelete = (index: number) => {
    const categoryToDelete = budgetLimits[index].category;
    
    if (confirm(`Tem certeza que deseja remover o limite para "${categoryToDelete}"?`)) {
      const newLimits = budgetLimits.filter((_, i) => i !== index);
      setBudgetLimits(newLimits);
      saveBudgetLimits(newLimits);
    }
  };

  const resetForm = () => {
    setSelectedCategory('');
    setBudgetLimit('');
    setIsEditing(null);
  };

  // Filtrar categorias disponíveis para o dropdown (remover as que já têm limites se não estiver em modo edição)
  const filteredCategories = isEditing !== null 
    ? availableCategories 
    : availableCategories.filter(category => 
        !budgetLimits.some(budget => budget.category === category)
      );

  const getProgress = (category: string, limit: number): number => {
    // Normalizar categoria para comparação
    const normalizedCategory = category.toLowerCase();
    const spent = categorySpending[normalizedCategory] || 0;
    return Math.min((spent / limit) * 100, 100);
  };
      
  const isOverBudget = (category: string, limit: number): boolean => {
    // Normalizar categoria para comparação
    const normalizedCategory = category.toLowerCase();
    const spent = categorySpending[normalizedCategory] || 0;
    return spent > limit;
  };

  // Função para obter o valor gasto de uma categoria
  const getCategorySpent = (category: string): number => {
    const normalizedCategory = category.toLowerCase();
    return categorySpending[normalizedCategory] || 0;
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle>Limites de Gastos por Categoria</CardTitle>
        <CardDescription>
          Defina limites orçamentários para suas categorias de despesas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <select 
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Selecione uma categoria</option>
            {filteredCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="Valor limite"
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(e.target.value)}
            className="w-36"
            min="0"
            step="0.01"
          />
          <Button onClick={handleSaveBudget} className="flex items-center gap-1 whitespace-nowrap">
            <PlusCircle className="h-4 w-4" /> {isEditing !== null ? 'Atualizar' : 'Adicionar'} Limite
          </Button>
          {isEditing !== null && (
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80 overflow-auto pr-3">
          {budgetLimits.length > 0 ? (
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
                {budgetLimits.map((budget, index) => {
                  const spent = getCategorySpent(budget.category);
                  const progress = getProgress(budget.category, budget.limit);
                  const overBudget = isOverBudget(budget.category, budget.limit);
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{budget.category}</TableCell>
                      <TableCell>R$ {budget.limit.toFixed(2)}</TableCell>
                      <TableCell className={overBudget ? "text-red-500 font-bold" : ""}>
                        R$ {spent.toFixed(2)}
                        {overBudget && <AlertCircle className="inline ml-2 h-4 w-4" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={progress} 
                            className={`w-full ${overBudget ? "bg-red-200" : "bg-slate-200"}`}
                          />
                          <span className="text-xs whitespace-nowrap">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(index)}
                            className="text-red-600"
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
              Nenhum limite orçamentário definido. Adicione seu primeiro limite acima.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}