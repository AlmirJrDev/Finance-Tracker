# Finance Tracker

Controle financeiro pessoal: entradas e saídas, categorias, recorrências, limites por categoria e visão anual.

Next.js 16 + React 19 + Tailwind 4 + shadcn/ui, com TanStack Query e react-hook-form. Os dados ficam na [API](https://github.com/AlmirJrDev/finance-tracker-backend).

## Rodando localmente

1. Suba a API (no repositório do backend):

   ```bash
   npm run dev:memory
   ```

2. Configure e suba o front:

   ```bash
   cp .env.example .env.local   # preencha NEXTAUTH_SECRET; para testar sem Google use NEXT_PUBLIC_DEV_LOGIN=true
   npm install
   npm run dev
   ```

Com `NEXT_PUBLIC_DEV_LOGIN=true` aparece o botão **Entrar (dev)** na tela de login, que usa o login de desenvolvimento da API. Ele nunca é ativado em produção.

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos |
| `npm test` | Testes unitários (Vitest) |

## Como a autenticação funciona

1. O usuário entra com Google pelo NextAuth.
2. No callback `jwt` (servidor), o `id_token` do Google é trocado **uma vez** por um token da API (`POST /api/auth/google`), válido por 30 dias.
3. O token fica dentro da sessão criptografada do NextAuth, não no `localStorage`.
4. Se a API responder 401, o app mostra "sessão expirada" e faz logout.

## Organização

```
src/
  app/                  rotas do Next (página e NextAuth)
  components/
    dashboard.tsx       tela principal
    login-screen.tsx
    forms/              formulários (transação, seletor de categoria)
    ui/                 componentes de tela e shadcn/ui
  hooks/use-finance.ts  queries e mutations (TanStack Query)
  lib/
    api.ts              cliente HTTP tipado
    auth.ts             configuração do NextAuth
    money.ts            centavos <-> reais
    dates.ts            datas "YYYY-MM-DD" sem problemas de fuso
  types/finance.ts      contratos da API
```

Valores trafegam sempre em **centavos** e datas como **texto `YYYY-MM-DD`**.

Os limites por categoria e o controle de gastos variáveis ainda ficam no navegador (`localStorage`). Levá-los para a API está no plano da Fase 2.
