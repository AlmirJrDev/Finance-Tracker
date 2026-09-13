'use client';

import { ReactNode, useEffect, useState } from 'react';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError, setApiToken } from '@/lib/api';

let signingOut = false;

function handleApiError(error: unknown) {
  if (error instanceof ApiError && error.isAuthError && !signingOut) {
    signingOut = true;
    toast.error('Sua sessão expirou. Entre novamente.');
    signOut();
  }
}

function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleApiError }),
    mutationCache: new MutationCache({ onError: handleApiError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Erros 4xx não melhoram tentando de novo
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });
}

/** Repassa o token da API (guardado na sessão do NextAuth) para o cliente HTTP. */
function ApiTokenSync({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const backendToken = session?.backendToken ?? null;
  // Definido durante o render para já valer nas primeiras queries dos filhos.
  setApiToken(backendToken);
  useEffect(() => {
    if (backendToken) signingOut = false;
  }, [backendToken]);
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ApiTokenSync>{children}</ApiTokenSync>
      </QueryClientProvider>
    </SessionProvider>
  );
}
