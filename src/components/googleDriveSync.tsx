'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Cloud,
  User,
  LogOut,
  CheckCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  Shield,
  Zap,
  Info,
} from 'lucide-react'
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

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Quando a sessão do NextAuth estiver disponível, fazer login no backend
  // e obter o JWT próprio
    const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }, [])
  useEffect(() => {
    const idToken = (session as any)?.idToken
    if (!idToken) return

    api.loginWithGoogle(idToken as string)
      .then((data) => {
        setUserProfile(data.user)
      })
      .catch((err) => {
        showNotification('error', 'Erro ao autenticar com o backend: ' + err.message)
      })
  }, [session, showNotification ])


  if (!isMounted || status === 'loading') {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!session) {
    return (
      <Card className="w-full border-dashed border-2">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Cloud className="h-8 w-8 text-blue-500" />
          </div>
          <CardTitle className="text-xl">Finance Tracker</CardTitle>
          <CardDescription className="text-base">
            Faça login com o Google para acessar seus dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-green-700">Dados seguros</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
              <span className="text-blue-700">Sync em tempo real</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <RefreshCw className="h-5 w-5 text-purple-600" />
              <span className="text-purple-700">Multi-dispositivo</span>
            </div>
          </div>

          <Button
            onClick={() => signIn('google')}
            size="lg"
            className="w-full h-12 text-base"
          >
            <User className="mr-2 h-5 w-5" />
            Entrar com Google
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Seus dados são privados e acessados apenas por você
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Notificações */}
      {notification && (
        <Alert
          className={`border-l-4 ${
            notification.type === 'success'
              ? 'border-l-green-500 bg-green-50'
              : notification.type === 'error'
              ? 'border-l-red-500 bg-red-50'
              : 'border-l-blue-500 bg-blue-50'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <Info className="h-4 w-4 text-blue-600" />
          )}
          <AlertDescription
            className={
              notification.type === 'success'
                ? 'text-green-700'
                : notification.type === 'error'
                ? 'text-red-700'
                : 'text-blue-700'
            }
          >
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                className="rounded-full w-10 h-10 border-2 border-white shadow-sm"
                src={session.user?.image || ''}
                alt="Profile"
              />
              <div>
                <CardTitle className="text-lg">{session.user?.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span>{session.user?.email}</span>
                  <Badge variant="outline" className="text-green-600">
                    Conectado
                  </Badge>
                </CardDescription>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
    

          {/* Configurações avançadas */}
          {showAdvanced && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
              

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Desconectar</p>
                    <p className="text-sm text-muted-foreground">Sair da conta Google</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      api.setToken(null)
                      signOut()
                    }}
                  >
                    <LogOut className="mr-1 h-4 w-4" />
                    Sair
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}