'use client'

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Cloud, 
  Download, 
  Upload, 
  User, 
  LogOut, 
  CheckCircle, 
  AlertCircle, 
  List,
  Settings,
  Trash2,
  RefreshCw,
  Clock,
  HardDrive,
  Shield,
  Zap,
  Info,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
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
  const [isMounted, setIsMounted] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showBackupDetails, setShowBackupDetails] = useState(false)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true)
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null)
  
  // Refs para controlar chamadas e intervalos
  const autoBackupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isLoadingBackupsRef = useRef(false)
  const lastBackupLoadTimeRef = useRef<number>(0)

  // Constantes
  const STORAGE_KEY = 'finance-tracker-data'
  const BACKUP_FILENAME = 'finance-tracker-backup.json'
  const AUTO_BACKUP_INTERVAL = 5 * 60 * 1000 // 5 minutos
  const BACKUP_LIST_CACHE_TIME = 30 * 1000 // 30 segundos

  // Track mount state
  useEffect(() => {
    setIsMounted(true)
    const savedAutoBackup = localStorage.getItem('autoBackupEnabled')
    if (savedAutoBackup !== null) {
      setAutoBackupEnabled(JSON.parse(savedAutoBackup))
    }
  }, [])

  // Helper para mostrar notificações
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  // Safe localStorage access helper
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

  // Toggle auto backup
  const toggleAutoBackup = useCallback(() => {
    const newValue = !autoBackupEnabled
    setAutoBackupEnabled(newValue)
    setLocalStorageItem('autoBackupEnabled', JSON.stringify(newValue))
    showNotification('info', `Backup automático ${newValue ? 'ativado' : 'desativado'}`)
  }, [autoBackupEnabled, setLocalStorageItem, showNotification])

  // Função otimizada para carregar backups com cache
  const loadAvailableBackups = useCallback(async (forceRefresh = false) => {
    if (isLoadingBackupsRef.current) return

    const now = Date.now()
    if (!forceRefresh && (now - lastBackupLoadTimeRef.current) < BACKUP_LIST_CACHE_TIME) {
      return
    }

    if (!session?.accessToken) return

    isLoadingBackupsRef.current = true
    lastBackupLoadTimeRef.current = now

    try {
      const backups = await listBackups()
      setAvailableBackups(backups)
    } catch (error) {
      console.error('Erro ao carregar backups:', error)
      showNotification('error', 'Erro ao carregar lista de backups')
    } finally {
      isLoadingBackupsRef.current = false
    }
  }, [listBackups, session?.accessToken, showNotification])

  // Carrega informações do último backup
  useEffect(() => {
    if (!isMounted) return
    
    const saved = getLocalStorageItem('lastBackupTime')
    if (saved) {
      setLastBackup(saved)
    }
  }, [isMounted, getLocalStorageItem])

  // Carrega backups quando usuário faz login
  useEffect(() => {
    if (session?.accessToken) {
      loadAvailableBackups(true)
    } else {
      setAvailableBackups([])
      clearCache()
    }
  }, [session?.accessToken, loadAvailableBackups, clearCache])

  // Backup automático
  useEffect(() => {
    if (!isMounted || !autoBackupEnabled) return

    if (autoBackupIntervalRef.current) {
      clearInterval(autoBackupIntervalRef.current)
      autoBackupIntervalRef.current = null
    }

    if (session?.accessToken) {
      const hasData = getLocalStorageItem(STORAGE_KEY)
      
      if (hasData) {
        autoBackupIntervalRef.current = setInterval(async () => {
          try {
            await autoBackup(STORAGE_KEY, BACKUP_FILENAME)
            const now = new Date().toLocaleString('pt-BR')
            setLastBackup(now)
            setLocalStorageItem('lastBackupTime', now)
          } catch (error) {
            console.warn('Backup automático falhou:', error)
          }
        }, AUTO_BACKUP_INTERVAL)
      }
    }

    return () => {
      if (autoBackupIntervalRef.current) {
        clearInterval(autoBackupIntervalRef.current)
        autoBackupIntervalRef.current = null
      }
    }
  }, [session?.accessToken, autoBackup, isMounted, autoBackupEnabled, getLocalStorageItem, setLocalStorageItem])

  // Funções de ação melhoradas
  const handleBackup = useCallback(async () => {
    const hasData = getLocalStorageItem(STORAGE_KEY)
    if (!hasData) {
      showNotification('error', 'Nenhum dado encontrado para fazer backup')
      return
    }

    const success = await syncLocalStorageToGoogleDrive(STORAGE_KEY, BACKUP_FILENAME)
    
    if (success) {
      const now = new Date().toLocaleString('pt-BR')
      setLastBackup(now)
      setBackupStatus('success')
      setLocalStorageItem('lastBackupTime', now)
      
      await loadAvailableBackups(true)
      setTimeout(() => setBackupStatus('idle'), 3000)
      
      showNotification('success', 'Backup realizado com sucesso!')
    } else {
      setBackupStatus('error')
      setTimeout(() => setBackupStatus('idle'), 3000)
      showNotification('error', `Erro no backup: ${error}`)
    }
  }, [syncLocalStorageToGoogleDrive, loadAvailableBackups, error, getLocalStorageItem, setLocalStorageItem, showNotification])

  const handleRestore = useCallback(async () => {
    const confirmed = confirm(
      '⚠️ ATENÇÃO: Isso irá sobrescrever todos os seus dados locais.\n\nDeseja continuar?'
    )
    
    if (!confirmed) return

    const success = await restoreFromGoogleDrive(BACKUP_FILENAME, STORAGE_KEY)
    
    if (success) {
      showNotification('success', 'Dados restaurados! Recarregando página...')
      setTimeout(() => window.location.reload(), 2000)
    } else {
      showNotification('error', `Erro na restauração: ${error}`)
    }
  }, [restoreFromGoogleDrive, error, showNotification])

  // Funções auxiliares memoizadas
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
      const date = new Date(dateString)
      const now = new Date()
      const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
      
      if (diffHours < 1) return 'Há poucos minutos'
      if (diffHours < 24) return `Há ${Math.floor(diffHours)} horas`
      if (diffHours < 48) return 'Ontem'
      return date.toLocaleString('pt-BR')
    } catch {
      return dateString
    }
  }, [])

  const getBackupStatusColor = useMemo(() => {
    if (!hasLocalData) return 'text-gray-400'
    if (availableBackups.length === 0) return 'text-yellow-500'
    return 'text-green-500'
  }, [hasLocalData, availableBackups.length])

  const getConnectionStatus = useMemo(() => {
    if (!session) return { status: 'disconnected', text: 'Desconectado', color: 'text-red-500' }
    if (isLoading) return { status: 'syncing', text: 'Sincronizando...', color: 'text-blue-500' }
    return { status: 'connected', text: 'Conectado', color: 'text-green-500' }
  }, [session, isLoading])

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (autoBackupIntervalRef.current) {
        clearInterval(autoBackupIntervalRef.current)
      }
    }
  }, [])

  // Loading state
  if (!isMounted || status === 'loading') {
    return (
      <Card className="w-full">
        <CardContent className="p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-sm text-muted-foreground">Carregando configurações da conta...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Not logged in
  if (!session) {
    return (
      <Card className="w-full border-dashed border-2">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Cloud className="h-8 w-8 text-blue-500" />
          </div>
          <CardTitle className="text-xl">Backup Seguro na Nuvem</CardTitle>
          <CardDescription className="text-base">
            Proteja seus dados com backup automático no Google Drive
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
              <span className="text-blue-700">Sync automático</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <RefreshCw className="h-5 w-5 text-purple-600" />
              <span className="text-purple-700">Multi-dispositivo</span>
            </div>
          </div>
          
          <Button
            onClick={() => signIn('google')}
            disabled={isLoading}
            size="lg"
            className="w-full h-12 text-base"
          >
            <User className="mr-2 h-5 w-5" />
            Conectar com Google
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Seus dados ficam privados e são acessados apenas por você
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Notificações */}
      {notification && (
        <Alert className={`border-l-4 ${
          notification.type === 'success' ? 'border-l-green-500 bg-green-50' :
          notification.type === 'error' ? 'border-l-red-500 bg-red-50' :
          'border-l-blue-500 bg-blue-50'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
           notification.type === 'error' ? <AlertCircle className="h-4 w-4 text-red-600" /> :
           <Info className="h-4 w-4 text-blue-600" />}
          <AlertDescription className={
            notification.type === 'success' ? 'text-green-700' :
            notification.type === 'error' ? 'text-red-700' :
            'text-blue-700'
          }>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  className="rounded-full w-10 h-10 border-2 border-white shadow-sm" 
                  src={session.user?.image || ""} 
                  alt="Profile"
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getConnectionStatus.color.replace('text-', 'bg-')}`}></div>
              </div>
              <div>
                <CardTitle className="text-lg">Conta Google</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <span>{session.user?.email}</span>
                  <Badge variant="outline" className={getConnectionStatus.color}>
                    {getConnectionStatus.text}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <HardDrive className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Dados Locais</p>
                  <p className="text-lg font-bold">{getDataSize}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Cloud className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Backups</p>
                  <p className="text-lg font-bold">{availableBackups.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Último Backup</p>
                  <p className="text-sm font-bold">
                    {lastBackup ? formatDate(lastBackup) : 'Nunca'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Alertas */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!hasLocalData && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Nenhum dado local encontrado.</strong>
                <br />
                Adicione algumas transações ou restaure de um backup existente.
              </AlertDescription>
            </Alert>
          )}

          {/* Ações Principais */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleBackup}
              disabled={isLoading || !hasLocalData}
              className="flex-1"
              size="lg"
            >
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Salvando...' : 'Fazer Backup'}
            </Button>
            
            <Button
              onClick={handleRestore}
              disabled={isLoading || availableBackups.length === 0}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Restaurar
            </Button>
          </div>

          {/* Lista de Backups */}
          {availableBackups.length > 0 && (
            <Card>
              <CardHeader 
                className="cursor-pointer"
                onClick={() => setShowBackupDetails(!showBackupDetails)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Backups Disponíveis ({availableBackups.length})
                  </CardTitle>
                  {showBackupDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              
              {showBackupDetails && (
                <CardContent>
                  <div className="space-y-2">
                    {availableBackups.map((backup, index) => (
                      <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">{backup.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {formatDate(backup.modifiedTime)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Configurações Avançadas */}
          {showAdvanced && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações Avançadas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Backup Automático</p>
                    <p className="text-sm text-muted-foreground">
                      Salva automaticamente a cada 5 minutos
                    </p>
                  </div>
                  <Button
                    variant={autoBackupEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={toggleAutoBackup}
                  >
                    {autoBackupEnabled ? "Ativado" : "Desativado"}
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Atualizar Lista</p>
                    <p className="text-sm text-muted-foreground">
                      Recarrega os backups disponíveis
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadAvailableBackups(true)}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Desconectar Conta</p>
                    <p className="text-sm text-muted-foreground">
                      Remove acesso ao Google Drive
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => signOut()}
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