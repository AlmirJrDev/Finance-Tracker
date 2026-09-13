'use client';

import { useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';

const devLogin = process.env.NEXT_PUBLIC_DEV_LOGIN === 'true';

const ERROR_MESSAGES: Record<NonNullable<Session['error']>, string> = {
  BackendAuthError: 'Não conseguimos conectar à sua conta agora. Tente entrar novamente em instantes.',
  BackendTokenExpired: 'Sua sessão expirou. Entre novamente.',
};

export function LoginScreen({ error }: { error?: Session['error'] }) {
  const [devEmail, setDevEmail] = useState('dev@local.test');

  const enter = async (provider: 'google' | 'dev') => {
    // Descarta a sessão com erro antes de começar outra
    if (error) await signOut({ redirect: false });
    if (provider === 'dev') await signIn('dev', { email: devEmail, callbackUrl: '/' });
    else await signIn('google', { callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Controle Financeiro</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie suas finanças com simplicidade</p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <p role="alert" className="mb-5 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {ERROR_MESSAGES[error]}
            </p>
          )}

          <p className="text-zinc-400 text-sm text-center mb-6 leading-relaxed">
            Entre com sua conta Google para acessar seus dados de qualquer dispositivo
          </p>

          <button
            onClick={() => enter('google')}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-medium text-sm py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar com Google
          </button>

          {devLogin && (
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                enter('dev');
              }}
            >
              <input
                aria-label="E-mail de desenvolvimento"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-200"
              />
              <button type="submit" className="rounded-xl border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
                Entrar (dev)
              </button>
            </form>
          )}

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">seus dados são privados</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <div className="space-y-2">
            {['Sincronizado entre dispositivos', 'Acesso em qualquer lugar', 'Login seguro com Google'].map((text) => (
              <div key={text} className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
