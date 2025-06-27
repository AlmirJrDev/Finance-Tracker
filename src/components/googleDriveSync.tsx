'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Cloud, Download, Upload, User, LogOut, CheckCircle, AlertCircle, List } from 'lucide-react'
import { useGoogleDriveSync } from '@/service/useGoogleDriveSync'

export function GoogleDriveSync() {
  const { data: session, status } = useSession()
  const { 
    isLoading, 
    error, 
    syncLocalStorageToGoogleDrive, 
    restoreFromGoogleDrive,
    autoBackup,
    listBackups,
    clearCache
  } = useGoogleDriveSync()

  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [availableBackups, setAvailableBackups] = useState<Array<{id: string, name: string, modifiedTime: string}>>([])
  const [isMounted, setIsMounted] = useState(false) // Track if component is mounted
  
  // Refs para controlar chamadas e intervalos
  const autoBackupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingBackupsRef = useRef(false)
  const lastBackupLoadTimeRef = useRef<number>(0)

  // ✅ CONSTANTES - movidas para fora dos useEffects
  const STORAGE_KEY = 'finance-tracker-data'
  const BACKUP_FILENAME = 'finance-tracker-backup.json'
  const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000 // 5 minutos
  const BACKUP_LIST_CACHE_TIME = 30 * 1000 // 30 segundos

  // ✅ Track mount state
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ✅ Safe localStorage access helper
  const getLocalStorageItem = useCallback((key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('Error accessing localStorage:', error)
      return null
    }
  }, [])

  const setLocalStorageItem = useCallback((key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('Error setting localStorage:', error)
    }
  }, [])

  // ✅ Função otimizada para carregar backups com cache
  const loadAvailableBackups = useCallback(async (forceRefresh = false) => {
    // Evita chamadas simultâneas
    if (isLoadingBackupsRef.current) {
      console.log('🔄 Carregamento de backups já em progresso, ignorando...')
      return
    }

    // Cache por 30 segundos (evita recarregar constantemente)
    const now = Date.now()
    if (!forceRefresh && (now - lastBackupLoadTimeRef.current) < BACKUP_LIST_CACHE_TIME) {
      console.log('📦 Usando cache de backups...')
      return
    }

    if (!session?.accessToken) {
      console.log('❌ Sem token de acesso para carregar backups')
      return
    }

    isLoadingBackupsRef.current = true
    lastBackupLoadTimeRef.current = now

    try {
      console.log('🔄 Carregando lista de backups...')
      const backups = await listBackups()
      setAvailableBackups(backups)
      console.log(`✅ ${backups.length} backups carregados`)
    } catch (error) {
      console.error('❌ Erro ao carregar backups:', error)
    } finally {
      isLoadingBackupsRef.current = false
    }
  }, [listBackups, session?.accessToken])

  // ✅ Carrega informações do último backup (apenas uma vez)
  useEffect(() => {
    if (!isMounted) return
    
    const saved = getLocalStorageItem('lastBackupTime')
    if (saved) {
      setLastBackup(saved)
    }
  }, [isMounted, getLocalStorageItem])

  // ✅ Carrega backups quando usuário faz login (com controle)
  useEffect(() => {
    if (session?.accessToken) {
      console.log('👤 Usuário logado, carregando backups...')
      loadAvailableBackups(true) // Force refresh no login
    } else {
      // Limpa dados quando deslogado
      setAvailableBackups([])
      clearCache()
      console.log('👋 Usuário deslogado, limpando dados...')
    }
  }, [session?.accessToken, loadAvailableBackups, clearCache])

  // ✅ Backup automático otimizado (sem dependências que mudam constantemente)
  useEffect(() => {
    if (!isMounted) return

    // Limpa interval anterior
    if (autoBackupIntervalRef.current) {
      clearInterval(autoBackupIntervalRef.current)
      autoBackupIntervalRef.current = null
    }

    if (session?.accessToken) {
      // Verifica se há dados para fazer backup
      const hasData = getLocalStorageItem(STORAGE_KEY)
      
      if (hasData) {
        console.log('⏰ Iniciando backup automático a cada 5 minutos...')
        
        autoBackupIntervalRef.current = setInterval(async () => {
          console.log('🔄 Executando backup automático...')
          try {
            await autoBackup(STORAGE_KEY, BACKUP_FILENAME)
            console.log('✅ Backup automático concluído')
          } catch (error) {
            console.warn('⚠️ Backup automático falhou:', error)
          }
        }, AUTO_BACKUP_INTERVAL)
      } else {
        console.log('📭 Nenhum dado local encontrado para backup automático')
      }
    }

    // Cleanup function
    return () => {
      if (autoBackupIntervalRef.current) {
        clearInterval(autoBackupIntervalRef.current)
        autoBackupIntervalRef.current = null
        console.log('🧹 Backup automático cancelado')
      }
    }
  }, [session?.accessToken, autoBackup, isMounted, getLocalStorageItem]) // Dependências mínimas

  // ✅ Funções de ação otimizadas
  const handleBackup = useCallback(async () => {
    // Verifica se há dados para fazer backup
    const hasData = getLocalStorageItem(STORAGE_KEY)
    if (!hasData) {
      alert('⚠️ Nenhum dado encontrado para fazer backup')
      return
    }

    console.log('🔄 Iniciando backup manual...')
    const success = await syncLocalStorageToGoogleDrive(STORAGE_KEY, BACKUP_FILENAME)
    
    if (success) {
      const now = new Date().toLocaleString('pt-BR')
      setLastBackup(now)
      setBackupStatus('success')
      setLocalStorageItem('lastBackupTime', now)
      
      // Recarrega lista de backups após backup bem-sucedido
      await loadAvailableBackups(true)
      
      // Mostra sucesso por 3 segundos
      setTimeout(() => setBackupStatus('idle'), 3000)
      
      alert('✅ Backup realizado com sucesso!')
      console.log('✅ Backup manual concluído')
    } else {
      setBackupStatus('error')
      setTimeout(() => setBackupStatus('idle'), 3000)
      alert(`❌ Erro no backup: ${error}`)
      console.error('❌ Erro no backup manual:', error)
    }
  }, [syncLocalStorageToGoogleDrive, loadAvailableBackups, error, getLocalStorageItem, setLocalStorageItem])

  const handleRestore = useCallback(async () => {
    const confirmed = confirm(
      '⚠️ ATENÇÃO: Isso irá sobrescrever todos os seus dados locais com os dados do backup na nuvem.\n\n' +
      'Certifique-se de fazer um backup dos dados atuais se necessário.\n\n' +
      'Deseja continuar?'
    )
    
    if (!confirmed) return

    console.log('🔄 Iniciando restauração...')
    const success = await restoreFromGoogleDrive(BACKUP_FILENAME, STORAGE_KEY)
    
    if (success) {
      alert('✅ Dados restaurados com sucesso!\n\nA página será recarregada para aplicar as mudanças.')
      console.log('✅ Restauração concluída, recarregando página...')
      // Recarrega a página para aplicar os dados restaurados
      window.location.reload()
    } else {
      alert(`❌ Erro na restauração: ${error}`)
      console.error('❌ Erro na restauração:', error)
    }
  }, [restoreFromGoogleDrive, error])

  // ✅ Funções auxiliares memoizadas com verificação de mounting
  const getDataSize = useMemo(() => {
    if (!isMounted) return '0 KB'
    
    const data = getLocalStorageItem(STORAGE_KEY)
    if (!data) return '0 KB'
    
    const bytes = new Blob([data]).size
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }, [STORAGE_KEY, isMounted, getLocalStorageItem])

  const hasLocalData = useMemo(() => {
    if (!isMounted) return false
    
    const data = getLocalStorageItem(STORAGE_KEY)
    return data && data.length > 0
  }, [STORAGE_KEY, isMounted, getLocalStorageItem])

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR')
    } catch {
      return dateString
    }
  }, [])

  // ✅ Debug function otimizada
  const debugInfo = useCallback(() => {
    if (typeof window !== 'undefined') {
      const data = getLocalStorageItem(STORAGE_KEY)
      console.group('🔍 DEBUG INFO')
      console.log('Chave localStorage:', STORAGE_KEY)
      console.log('Dados encontrados:', data ? 'SIM' : 'NÃO')
      console.log('Tamanho dos dados:', data ? data.length : 0)
      console.log('Todas as chaves no localStorage:', Object.keys(localStorage))
      console.log('Session status:', status)
      console.log('Access token:', session?.accessToken ? 'PRESENTE' : 'AUSENTE')
      console.log('Backups disponíveis:', availableBackups.length)
      console.log('Loading state:', isLoading)
      console.log('Error state:', error)
      console.log('Component mounted:', isMounted)
      console.groupEnd()
    }
  }, [STORAGE_KEY, status, session?.accessToken, availableBackups.length, isLoading, error, isMounted, getLocalStorageItem])

  // ✅ Debug apenas uma vez no mount
  useEffect(() => {
    if (isMounted) {
      debugInfo()
    }
  }, [isMounted]) // Executa apenas quando o componente está montado

  // ✅ Cleanup geral no unmount
  useEffect(() => {
    return () => {
      if (autoBackupIntervalRef.current) {
        clearInterval(autoBackupIntervalRef.current)
      }
    }
  }, [])

  // ✅ Prevent rendering during SSR for localStorage-dependent content
  if (!isMounted) {
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

        {!hasLocalData && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhum dado local encontrado. Adicione algumas transações primeiro ou restaure de um backup.
              <br />
              <small className="text-xs opacity-75">
                Procurando por dados na chave: <code>{STORAGE_KEY}</code>
              </small>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Informações dos dados */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Tamanho dos dados locais:</p>
            <Badge variant="outline">{getDataSize}</Badge>
          </div>
          {lastBackup && (
            <div>
              <p className="text-muted-foreground">Último backup:</p>
              <Badge variant="outline">{lastBackup}</Badge>
            </div>
          )}
        </div>

        {/* Lista de backups disponíveis */}
        {availableBackups.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <List className="h-4 w-4" />
              Backups disponíveis na nuvem:
            </p>
            <div className="space-y-1">
              {availableBackups.map((backup) => (
                <div key={backup.id} className="text-xs text-muted-foreground flex justify-between">
                  <span>{backup.name}</span>
                  <span>{formatDate(backup.modifiedTime)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Botões de ação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Button
            onClick={handleBackup}
            disabled={isLoading || !hasLocalData}
            variant="default"
            className="flex items-center justify-center"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isLoading ? 'Salvando...' : 'Fazer Backup'}
          </Button>
          
          <Button
            onClick={handleRestore}
            disabled={isLoading || availableBackups.length === 0}
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
        
        {/* Botões de controle */}
        <div className="flex gap-2">
          <Button
            onClick={() => loadAvailableBackups(true)}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            🔄 Atualizar Lista
          </Button>
          
          <Button
            onClick={debugInfo}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            🔍 Debug Info
          </Button>
        </div>
        
        {/* Informações adicionais */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Dica:</strong> Backup automático a cada 5 minutos quando logado</p>
          <p>🔒 <strong>Segurança:</strong> Dados salvos na pasta privada do app no Drive</p>
          <p>📱 <strong>Sincronização:</strong> Acesse seus dados de qualquer dispositivo</p>
          <p>⚠️ <strong>Importante:</strong> Verifique se seu NextAuth está configurado com os escopos corretos do Google Drive</p>
        </div>
      </CardContent>
    </Card>
  )
}