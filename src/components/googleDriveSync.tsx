'use client'

import React, { useEffect, useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Cloud, Download, Upload, User, LogOut, CheckCircle, AlertCircle } from 'lucide-react'
import { useGoogleDriveSync } from '@/service/useGoogleDriveSync'

export function GoogleDriveSync() {
  const { data: session, status } = useSession()
  const { 
    isLoading, 
    error, 
    syncLocalStorageToGoogleDrive, 
    restoreFromGoogleDrive,
    autoBackup
  } = useGoogleDriveSync()

  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Chave do localStorage onde seus dados financeiros estão armazenados
  const STORAGE_KEY = 'financialData' // Ajuste conforme sua implementação
  const BACKUP_FILENAME = 'finance-tracker-backup.json'

  // Carrega informações do último backup
  useEffect(() => {
    const saved = localStorage.getItem('lastBackupTime')
    if (saved) {
      setLastBackup(saved)
    }
  }, [])

  // Backup automático quando dados mudam (opcional)
  useEffect(() => {
    if (session?.accessToken) {
      // Verifica se há dados para fazer backup
      const hasData = localStorage.getItem(STORAGE_KEY)
      if (hasData) {
        // Faz backup automático a cada 5 minutos (opcional)
        const interval = setInterval(() => {
          autoBackup(STORAGE_KEY, BACKUP_FILENAME)
        }, 5 * 60 * 1000) // 5 minutos

        return () => clearInterval(interval)
      }
    }
  }, [session, autoBackup])

  const handleBackup = async () => {
    const success = await syncLocalStorageToGoogleDrive(STORAGE_KEY, BACKUP_FILENAME)
    
    if (success) {
      const now = new Date().toLocaleString('pt-BR')
      setLastBackup(now)
      setBackupStatus('success')
      localStorage.setItem('lastBackupTime', now)
      
      // Mostra sucesso por 3 segundos
      setTimeout(() => setBackupStatus('idle'), 3000)
      
      alert('✅ Backup realizado com sucesso!')
    } else {
      setBackupStatus('error')
      setTimeout(() => setBackupStatus('idle'), 3000)
      alert(`❌ Erro no backup: ${error}`)
    }
  }

  const handleRestore = async () => {
    const confirmed = confirm(
      '⚠️ ATENÇÃO: Isso irá sobrescrever todos os seus dados locais com os dados do backup na nuvem.\n\n' +
      'Certifique-se de fazer um backup dos dados atuais se necessário.\n\n' +
      'Deseja continuar?'
    )
    
    if (!confirmed) return

    const success = await restoreFromGoogleDrive(BACKUP_FILENAME, STORAGE_KEY)
    
    if (success) {
      alert('✅ Dados restaurados com sucesso!\n\nA página será recarregada para aplicar as mudanças.')
      // Recarrega a página para aplicar os dados restaurados
      window.location.reload()
    } else {
      alert(`❌ Erro na restauração: ${error}`)
    }
  }

  const getDataSize = () => {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return '0 KB'
    
    const bytes = new Blob([data]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (status === 'loading') {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex justify-center items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span>Carregando...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!session) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Backup na Nuvem
          </CardTitle>
          <CardDescription>
            Faça login com Google para sincronizar seus dados financeiros na nuvem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>• Seus dados ficam seguros no Google Drive</p>
              <p>• Acesse de qualquer dispositivo</p>
              <p>• Backup automático quando logado</p>
            </div>
            
            <Button
              onClick={() => signIn('google')}
              disabled={isLoading}
              className="w-full"
            >
              <User className="mr-2 h-4 w-4" />
              Fazer Login com Google
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Backup na Nuvem
          {backupStatus === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
          {backupStatus === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
        </CardTitle>
        <CardDescription>
          Logado como: <strong>{session.user?.email}</strong>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {backupStatus === 'success' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>Backup realizado com sucesso!</AlertDescription>
          </Alert>
        )}
        
        {/* Informações dos dados */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tamanho dos dados:</p>
            <Badge variant="outline">{getDataSize()}</Badge>
          </div>
          {lastBackup && (
            <div>
              <p className="text-muted-foreground">Último backup:</p>
              <Badge variant="outline">{lastBackup}</Badge>
            </div>
          )}
        </div>
        
        {/* Botões de ação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Button
            onClick={handleBackup}
            disabled={isLoading}
            variant="default"
            className="flex items-center justify-center"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isLoading ? 'Salvando...' : 'Fazer Backup'}
          </Button>
          
          <Button
            onClick={handleRestore}
            disabled={isLoading}
            variant="outline"
            className="flex items-center justify-center"
          >
            <Download className="mr-2 h-4 w-4" />
            {isLoading ? 'Restaurando...' : 'Restaurar Dados'}
          </Button>
          
          <Button
            onClick={() => signOut()}
            variant="secondary"
            className="flex items-center justify-center"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
        
        {/* Informações adicionais */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Dica:</strong> Backup automático a cada 5 minutos quando logado</p>
          <p>🔒 <strong>Segurança:</strong> Dados salvos na pasta privada do app no Drive</p>
          <p>📱 <strong>Sincronização:</strong> Acesse seus dados de qualquer dispositivo</p>
        </div>
      </CardContent>
    </Card>
  )
}