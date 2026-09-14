'use client';

import { useState } from 'react';
import { AlertTriangle, Landmark, Loader2, Plug, RefreshCw, Unplug } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConnectionMutations, useConnections, useConnectionStatus } from '@/hooks/use-finance';
import { api } from '@/lib/api';
import { formatDate, todayStr } from '@/lib/dates';
import type { BankConnection } from '@/types/finance';

function lastSyncLabel(c: BankConnection) {
  if (!c.lastSyncAt) return 'ainda não sincronizado';
  const d = new Date(c.lastSyncAt);
  return `sincronizado em ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Conexão com bancos via Open Finance (Meu Pluggy). */
export function BankConnections() {
  const { data: status } = useConnectionStatus();
  const { data: connections = [] } = useConnections(Boolean(status?.allowed));
  const { create, sync, remove } = useConnectionMutations();
  const { resolvedTheme } = useTheme();
  const [opening, setOpening] = useState(false);
  const [importFrom, setImportFrom] = useState(`${todayStr().slice(0, 7)}-01`);

  if (!status?.enabled) return null;

  if (!status.allowed) {
    return (
      <p className="rounded-md border p-3 text-xs text-muted-foreground">
        A conexão automática com bancos está disponível só para o titular configurado (Meu Pluggy, uso pessoal).
      </p>
    );
  }

  const connect = async () => {
    setOpening(true);
    try {
      const { accessToken, connectorId } = await api.connections.connectToken();
      // O SDK usa window: carrega só no navegador, na hora de abrir
      const { PluggyConnect } = await import('pluggy-connect-sdk');
      const widget = new PluggyConnect({
        connectToken: accessToken,
        connectorIds: [connectorId],
        selectedConnectorId: connectorId,
        language: 'pt',
        theme: resolvedTheme === 'dark' ? 'dark' : 'light',
        onSuccess: async ({ item }) => {
          const toastId = toast.loading('Importando contas e transações...');
          try {
            const result = await create.mutateAsync({ itemId: item.id, importFrom });
            toast.success('Banco conectado', {
              id: toastId,
              description: result.sync
                ? `${result.sync.accounts} conta(s) e ${result.sync.created} transação(ões) importadas.`
                : result.connection.lastSyncError ?? undefined,
            });
          } catch (err) {
            toast.error('Não foi possível registrar a conexão', { id: toastId, description: (err as Error).message });
          }
        },
        onError: ({ message }) => {
          toast.error('Erro na conexão com o banco', { description: message });
        },
      });
      await widget.init();
    } catch (err) {
      toast.error('Não foi possível abrir a conexão', { description: (err as Error).message });
    } finally {
      setOpening(false);
    }
  };

  return (
    <section className="space-y-3 rounded-md border p-3" aria-labelledby="bancos-conectados">
      <div className="flex items-center justify-between gap-2">
        <h3 id="bancos-conectados" className="flex items-center gap-2 text-sm font-medium">
          <Landmark className="h-4 w-4" aria-hidden /> Bancos conectados
        </h3>
      </div>

      {connections.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Conecte seus bancos pelo Meu Pluggy (Open Finance) para as transações entrarem sozinhas. As contas são criadas automaticamente e o saldo fica igual ao do banco.
        </p>
      )}

      <ul className="space-y-2">
        {connections.map((c) => (
          <li key={c.id} className="rounded-md bg-muted/50 p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{c.connectorName ?? 'Banco'}</p>
                <p className="text-xs text-muted-foreground">
                  {lastSyncLabel(c)} · desde {formatDate(c.importFrom)}
                </p>
                {c.accounts.length > 0 && <p className="truncate text-xs text-muted-foreground">{c.accounts.map((a) => a.name).join(', ')}</p>}
                {c.lastSyncError && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" aria-hidden /> {c.lastSyncError}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Sincronizar ${c.connectorName ?? 'banco'}`}
                  disabled={sync.isPending}
                  onClick={async () => {
                    try {
                      const r = await sync.mutateAsync(c.id);
                      toast.success('Sincronizado', { description: `${r.sync.created} nova(s), ${r.sync.updated} atualizada(s).` });
                    } catch (err) {
                      toast.error('Não foi possível sincronizar', { description: (err as Error).message });
                    }
                  }}
                >
                  {sync.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-600"
                  aria-label={`Desconectar ${c.connectorName ?? 'banco'}`}
                  disabled={remove.isPending}
                  onClick={async () => {
                    if (!confirm('Desconectar este banco? As novas transações deixam de entrar.')) return;
                    const deleteData = confirm('Apagar também as transações importadas? (Cancelar = manter o histórico como manual)');
                    try {
                      const r = await remove.mutateAsync({ id: c.id, deleteData });
                      toast.success('Banco desconectado', { description: deleteData ? `${r.deletedTransactions} transação(ões) apagada(s).` : 'Histórico mantido.' });
                    } catch (err) {
                      toast.error('Não foi possível desconectar', { description: (err as Error).message });
                    }
                  }}
                >
                  <Unplug className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="import-from" className="text-xs">
            Importar a partir de
          </Label>
          <Input id="import-from" type="date" value={importFrom} max={todayStr()} onChange={(e) => setImportFrom(e.target.value)} className="h-9 w-40" />
        </div>
        <Button size="sm" onClick={connect} disabled={opening || create.isPending}>
          {opening || create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
          Conectar banco (Meu Pluggy)
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        O que aconteceu antes dessa data entra como um único ajuste de saldo. Se você já lança essas contas à mão, escolha uma data a partir da qual quer que o banco assuma.
      </p>
    </section>
  );
}
