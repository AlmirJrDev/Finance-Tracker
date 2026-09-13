'use client';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDeleteTransaction, useInstallmentMutations } from '@/hooks/use-finance';
import { formatCents } from '@/lib/money';
import type { Transaction } from '@/types/finance';

type Props = { transaction: Transaction | null; onClose: () => void };

export function DeleteTransactionDialog({ transaction, onClose }: Props) {
  const removeOne = useDeleteTransaction();
  const { remove: removeGroup } = useInstallmentMutations();
  const busy = removeOne.isPending || removeGroup.isPending;

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
      onClose();
    } catch (err) {
      toast.error('Erro ao excluir', { description: (err as Error).message });
    }
  };

  const t = transaction;
  const installment = t?.installment;

  return (
    <Dialog open={Boolean(t)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Excluir transação</DialogTitle>
          <DialogDescription>
            {t && (
              <>
                “{t.description}” · {formatCents(t.amountCents)}
                {installment && ` · parcela ${installment.number} de ${installment.total}`}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {installment ? (
          <div className="flex flex-col gap-2">
            <Button variant="outline" disabled={busy} onClick={() => run(() => removeOne.mutateAsync(t!.id), 'Parcela excluída.')}>
              Só esta parcela
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                run(
                  () => removeGroup.mutateAsync({ groupId: installment.groupId, onlyPending: true }),
                  'Parcelas pendentes excluídas.'
                )
              }
            >
              Todas as parcelas pendentes (mantém as pagas)
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                run(() => removeGroup.mutateAsync({ groupId: installment.groupId, onlyPending: false }), 'Parcelamento excluído.')
              }
            >
              Parcelamento inteiro
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Essa ação não pode ser desfeita.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          {!installment && (
            <Button variant="destructive" disabled={busy} onClick={() => run(() => removeOne.mutateAsync(t!.id), 'Transação excluída.')}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
