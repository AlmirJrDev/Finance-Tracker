'use client';

import { useState } from 'react';
import { Check, Edit, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from './scroll-area';
import { useCategories, useCategoryMutations } from '@/hooks/use-finance';
import type { Category } from '@/types/finance';

type Draft = { name: string; icon: string; color: string };

const toDraft = (c?: Category): Draft => ({ name: c?.name ?? '', icon: c?.icon ?? '', color: c?.color ?? '#6B7280' });

export default function CategoryManager({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: categories = [], isLoading } = useCategories();
  const { create, update, remove } = useCategoryMutations();
  const [draft, setDraft] = useState<Draft>(toDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(toDraft());

  const fail = (action: string) => (err: unknown) => toast.error(`Erro ao ${action}`, { description: (err as Error).message });

  const handleCreate = async () => {
    if (draft.name.trim().length < 2) return;
    try {
      await create.mutateAsync({ name: draft.name.trim(), icon: draft.icon.trim() || null, color: draft.color });
      setDraft(toDraft());
      toast.success('Categoria criada.');
    } catch (err) {
      fail('criar categoria')(err);
    }
  };

  const handleUpdate = async (id: string) => {
    if (editDraft.name.trim().length < 2) return;
    try {
      await update.mutateAsync({ id, name: editDraft.name.trim(), icon: editDraft.icon.trim() || null, color: editDraft.color });
      setEditingId(null);
      toast.success('Categoria atualizada em todas as transações.');
    } catch (err) {
      fail('atualizar categoria')(err);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Excluir "${cat.name}"? As transações serão movidas para "Outros".`)) return;
    try {
      const result = await remove.mutateAsync(cat.id);
      toast.success('Categoria removida.', {
        description: result.movedCount ? `${result.movedCount} transação(ões) movida(s) para Outros.` : undefined,
      });
    } catch (err) {
      fail('excluir categoria')(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl flex flex-col max-h-[90vh] p-4 gap-0">
        <DialogHeader className="pb-3">
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>
            Renomear uma categoria atualiza todo o histórico. Categorias padrão podem ser personalizadas, mas não excluídas.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex gap-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <Input
            aria-label="Ícone"
            className="w-14 text-center"
            placeholder="🙂"
            value={draft.icon}
            onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
          />
          <Input
            aria-label="Nome da nova categoria"
            placeholder="Nova categoria"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <input
            aria-label="Cor"
            type="color"
            className="h-9 w-10 cursor-pointer rounded border bg-transparent"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          />
          <Button type="submit" disabled={create.isPending} className="flex items-center gap-1">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </form>

        <ScrollArea className="flex-grow overflow-y-auto pr-3">
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
                  <TableRow key={cat.id}>
                    <TableCell>
                      {editingId === cat.id ? (
                        <form
                          className="flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleUpdate(cat.id);
                          }}
                        >
                          <Input
                            aria-label="Ícone"
                            className="w-14 text-center"
                            value={editDraft.icon}
                            onChange={(e) => setEditDraft({ ...editDraft, icon: e.target.value })}
                          />
                          <Input
                            aria-label="Nome"
                            autoFocus
                            value={editDraft.name}
                            onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                            onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                          />
                          <input
                            aria-label="Cor"
                            type="color"
                            className="h-9 w-10 cursor-pointer rounded border bg-transparent"
                            value={editDraft.color}
                            onChange={(e) => setEditDraft({ ...editDraft, color: e.target.value })}
                          />
                          <Button type="submit" size="icon" variant="ghost" aria-label="Salvar" disabled={update.isPending}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" aria-label="Cancelar" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </form>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: cat.color }} aria-hidden />
                          {cat.icon && <span>{cat.icon}</span>}
                          {cat.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.isDefault ? 'secondary' : 'default'}>{cat.isDefault ? 'Padrão' : 'Personalizada'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${cat.name}`}
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditDraft(toDraft(cat));
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${cat.name}`}
                          onClick={() => handleDelete(cat)}
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
        </ScrollArea>

        <DialogFooter className="pt-3 border-t mt-2 flex-shrink-0">
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
