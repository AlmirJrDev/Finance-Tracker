'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { loadCategories, saveCategories, DEFAULT_CATEGORIES } from '@/lib/categories';
import { ScrollArea } from './scroll-area';

type CategoryManagerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CategoryManager({ isOpen, onClose }: CategoryManagerProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategories(loadCategories());
    }
  }, [isOpen]);

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updated = [...categories, newCategory.trim()];
      setCategories(updated);
      saveCategories(updated);
      setNewCategory('');
    }
  };

  const handleUpdateCategory = (index: number, value: string) => {
    if (value.trim() && !categories.includes(value.trim())) {
      const updated = [...categories];
      updated[index] = value.trim();
      setCategories(updated);
      saveCategories(updated);
      setEditingIndex(null);
    }
  };

  const handleDeleteCategory = (index: number) => {
    const categoryToDelete = categories[index];
    
    // Não permitir excluir categorias padrão
    if (DEFAULT_CATEGORIES.includes(categoryToDelete)) {
      alert('Não é possível excluir categorias padrão do sistema.');
      return;
    }
    
    if (confirm(`Tem certeza que deseja excluir a categoria "${categoryToDelete}"?`)) {
      const updated = categories.filter((_, i) => i !== index);
      setCategories(updated);
      saveCategories(updated);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Tem certeza que deseja restaurar as categorias padrão? Categorias personalizadas serão perdidas.')) {
      setCategories(DEFAULT_CATEGORIES);
      saveCategories(DEFAULT_CATEGORIES);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl data-[dark=true]:text-white duration-300 data-[dark=true]:bg-darkSubComponent sm:max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>Adicione ou altere uma categoria</DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nova categoria"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {editingIndex === index ? (
                          <Input
                            value={category}
                            onChange={(e) => {
                              const updated = [...categories];
                              updated[index] = e.target.value;
                              setCategories(updated);
                            }}
                            onBlur={() => handleUpdateCategory(index, categories[index])}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateCategory(index, categories[index]);
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          category
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={DEFAULT_CATEGORIES.includes(category) ? "secondary" : "default"}>
                          {DEFAULT_CATEGORIES.includes(category) ? 'Padrão' : 'Personalizada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingIndex(index)}
                            disabled={DEFAULT_CATEGORIES.includes(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCategory(index)}
                            disabled={DEFAULT_CATEGORIES.includes(category)}
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
            </CardContent>
          </Card>
        </ScrollArea>
        
        <DialogFooter className="mt-4 pt-2 flex justify-between">
          <Button variant="destructive" onClick={resetToDefaults}>
            Restaurar Padrões
          </Button>
          <Button onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}