'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LogOut, CheckCircle, AlertCircle, Settings } from 'lucide-react'
import api from '@/lib/api'
import Image from 'next/image'

export function GoogleDriveSync() {
  const { data: session, status } = useSession()
  const [isMounted, setIsMounted] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)
  const [, setUserProfile] = useState<any>(null)

  useEffect(() => { setIsMounted(true) }, [])

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  useEffect(() => {
    const idToken = (session as any)?.idToken
    if (!idToken) return
    api.loginWithGoogle(idToken)
      .then((data) => setUserProfile(data.user))
      .catch((err) => showNotification('error', 'Erro ao autenticar: ' + err.message))
  }, [(session as any)?.idToken, showNotification])

  if (!isMounted || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <div className="w-full max-w-sm relative z-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Controle Financeiro</h1>
            <p className="text-sm text-zinc-500 mt-1">Gerencie suas finanças com simplicidade</p>
          </div>

          {/* Card */}
          <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            <p className="text-zinc-400 text-sm text-center mb-6 leading-relaxed">
              Entre com sua conta Google para acessar seus dados de qualquer dispositivo
            </p>

            <button
              onClick={() => signIn('google')}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-medium text-sm py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-600">seus dados são privados</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <div className="space-y-2">
              {[
                'Sincronizado em tempo real',
                'Acesso em qualquer dispositivo',
                'Dados criptografados e seguros',
              ].map((text) => (
                <div key={text} className="flex items-center gap-2 text-xs text-zinc-500">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Sessão ativa — card compacto
  return (
    <div className="space-y-3">
      {notification && (
        <Alert className={`border-l-4 ${
          notification.type === 'error' ? 'border-l-red-500 bg-red-50' : 'border-l-emerald-500 bg-emerald-50'
        }`}>
          {notification.type === 'error'
            ? <AlertCircle className="h-4 w-4 text-red-600" />
            : <CheckCircle className="h-4 w-4 text-emerald-600" />}
          <AlertDescription className={notification.type === 'error' ? 'text-red-700' : 'text-emerald-700'}>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                className="rounded-full border-2 border-white shadow-sm"
                src={session.user?.image || '/default-avatar.png'}
                alt="Profile"
                width={36}
                height={36}
              />
              <div>
                <p className="font-medium text-sm">{session.user?.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-muted-foreground">{session.user?.email}</p>
                  <Badge variant="outline" className="text-emerald-600 text-xs py-0">
                    Conectado
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {showAdvanced && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Desconectar</p>
                <p className="text-xs text-muted-foreground">Sair da conta Google</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => { api.setToken(null); signOut() }}>
                <LogOut className="mr-1 h-4 w-4" /> Sair
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}