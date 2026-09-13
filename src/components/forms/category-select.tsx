'use client';

import { useState } from 'react';
import { Check, PlusCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories, useCategoryMutations } from '@/hooks/use-finance';

const NONE = '__none__';

type Props = {
  id?: string;
  value: string | null;
  onChange: (categoryId: string | null) => void;
};

/** Seleciona uma categoria pelo ID, com opção de criar uma nova sem sair do formulário. */
export function CategorySelect({ id, value, onChange }: Props) {
  const { data: categories, isLoading } = useCategories();
  const { create } = useCategoryMutations();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const submitNew = async () => {
    if (name.trim().length < 2) return;
    try {
      const created = await create.mutateAsync({ name: name.trim() });
      onChange(created.id);
      setName('');
      setCreating(false);
    } catch (err) {
      toast.error('Erro ao criar categoria', { description: (err as Error).message });
    }
  };

  if (creating) {
    return (
      <div className="flex gap-1">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nova categoria"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitNew();
            }
            if (e.key === 'Escape') setCreating(false);
          }}
        />
        <Button type="button" size="icon" onClick={submitNew} disabled={create.isPending} aria-label="Criar categoria">
          <Check className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => setCreating(false)} aria-label="Cancelar">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (isLoading) return <div className="h-9 w-full rounded-md border bg-muted animate-pulse" />;

  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-60 overflow-y-auto">
        <SelectItem value={NONE}>Sem categoria</SelectItem>
        {categories?.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            {cat.icon ? `${cat.icon} ` : ''}
            {cat.name}
          </SelectItem>
        ))}
        <div className="py-2 px-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full flex items-center justify-center gap-1"
            onClick={() => setCreating(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            Adicionar categoria
          </Button>
        </div>
      </SelectContent>
    </Select>
  );
}
