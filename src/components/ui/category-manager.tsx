'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { ScrollArea } from './scroll-area';
import { toast } from 'sonner';
import api from '@/lib/api';


type ApiCategory = {
  _id: string;
  name: string;
  isDefault: boolean;
  color?: string;
  icon?: string;
};

type CategoryManagerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CategoryManager({ isOpen, onClose }: CategoryManagerProps) {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    api.getCategories()
      .then((res) => setCategories(res.data))
      .catch((err) => toast.error('Erro ao carregar categorias: ' + err.message))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    if (categories.some((c) => c.name.toLowerCase() === newCategory.trim().toLowerCase())) {
      toast.error('Já existe uma categoria com esse nome.');
      return;
    }
    try {
      const res = await api.createCategory({ name: newCategory.trim() });
      setCategories((prev) => [...prev, res.data]);
      setNewCategory('');
      toast.success('Categoria criada.');
    } catch (err: any) {
      toast.error('Erro ao criar categoria: ' + err.message);
    }
  };

  const handleStartEdit = (cat: ApiCategory) => {
    setEditingId(cat._id);
    setEditingValue(cat.name);
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingValue.trim()) return;
    try {
      const res = await api.updateCategory(id, { name: editingValue.trim() });
      setCategories((prev) => prev.map((c) => c._id === id ? res.data : c));
      setEditingId(null);
      toast.success('Categoria atualizada.');
    } catch (err: any) {
      toast.error('Erro ao atualizar categoria: ' + err.message);
    }
  };

  const handleDeleteCategory = async (cat: ApiCategory) => {
    if (cat.isDefault) {
      toast.error('Não é possível excluir categorias padrão do sistema.');
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir "${cat.name}"? Transações serão movidas para "Outros".`)) return;
    try {
      await api.deleteCategory(cat._id);
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
      toast.success('Categoria removida.');
    } catch (err: any) {
      toast.error('Erro ao excluir categoria: ' + err.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl sm:max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>Adicione ou altere uma categoria</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nova categoria"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <Button onClick={handleAddCategory} className="flex items-center gap-1">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>

        <ScrollArea className="flex-grow overflow-y-auto pr-3">
          <Card className="border shadow-sm">
            <CardHeader className="py-3">
              <CardTitle>Suas Categorias</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat._id}>
                        <TableCell>
                          {editingId === cat._id ? (
                            <Input
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleUpdateCategory(cat._id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCategory(cat._id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                            />
                          ) : (
                            <span className="flex items-center gap-2">
                              {cat.icon && <span>{cat.icon}</span>}
                              {cat.name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cat.isDefault ? 'secondary' : 'default'}>
                            {cat.isDefault ? 'Padrão' : 'Personalizada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit(cat)}
                              disabled={cat.isDefault}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategory(cat)}
                              disabled={cat.isDefault}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-2">
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}