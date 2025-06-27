// service/useGoogleDriveSync.ts
import { useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

export function useGoogleDriveSync() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Cache para evitar múltiplas chamadas
  const folderIdRef = useRef<string | null>(null)
  const lastBackupTimeRef = useRef<{ [key: string]: number }>({})
  
  // Debounce para backup automático (evita chamadas excessivas)
  const BACKUP_DEBOUNCE_TIME = 5000 // 5 segundos

  const syncLocalStorageToGoogleDrive = useCallback(async (
    localStorageKey: string, 
    fileName: string
  ): Promise<boolean> => {
    if (!session?.accessToken) {
      setError('Usuário não autenticado')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Pega os dados do localStorage
      const localData = localStorage.getItem(localStorageKey)
      
      if (!localData) {
        setError('Nenhum dado encontrado no localStorage')
        return false
      }

      // 2. Converte para objeto JavaScript
      let parsedData
      try {
        parsedData = JSON.parse(localData)
      } catch (parseError) {
        console.error('Erro ao interpretar dados locais:', parseError)
        setError('Erro ao interpretar dados locais')
        return false
      }

      // 3. Adiciona metadados do backup
      const backupData = {
        data: parsedData,
        timestamp: new Date().toISOString(),
        version: '1.0',
        source: 'finance-tracker'
      }

      // 4. Cria ou obtém a pasta de backup (usando cache)
      const folderId = await getOrCreateBackupFolder()
      if (!folderId) {
        throw new Error('Falha ao criar/acessar pasta de backup')
      }

      // 5. Verifica se já existe um arquivo com esse nome
      const existingFileId = await checkIfFileExists(fileName, folderId)

      let success = false
      if (existingFileId) {
        // Atualiza arquivo existente
        success = await updateFileInDrive(existingFileId, backupData)
      } else {
        // Cria novo arquivo
        success = await uploadFileToDrive(backupData, fileName, folderId)
      }

      if (!success) {
        throw new Error('Falha no upload para o Google Drive')
      }

      // Atualiza timestamp do último backup
      lastBackupTimeRef.current[localStorageKey] = Date.now()
      
      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro no backup:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken])

  const restoreFromGoogleDrive = useCallback(async (
    fileName: string,
    localStorageKey: string
  ): Promise<boolean> => {
    if (!session?.accessToken) {
      setError('Usuário não autenticado')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Obtém a pasta de backup (usando cache)
      const folderId = await getOrCreateBackupFolder()
      if (!folderId) {
        throw new Error('Pasta de backup não encontrada')
      }

      // 2. Busca o arquivo no Google Drive
      const fileId = await checkIfFileExists(fileName, folderId)
      
      if (!fileId) {
        throw new Error('Arquivo de backup não encontrado no Google Drive')
      }

      // 3. Faz download do arquivo
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Erro no download: ${response.status} ${response.statusText}`)
      }

      // 4. Obtém o conteúdo do arquivo
      const fileContent = await response.text()
      
      // 5. Parseia o JSON
      let backupData
      try {
        backupData = JSON.parse(fileContent)
      } catch (parseError) {
        console.error('Erro ao parsear arquivo de backup:', parseError)
        throw new Error('Arquivo de backup corrompido ou inválido')
      }

      // 6. Verifica se os dados têm a estrutura esperada 
      if (!backupData || !backupData.data) {
        throw new Error('Estrutura do arquivo de backup inválida')
      }

      // 7. Salva no localStorage
      localStorage.setItem(localStorageKey, JSON.stringify(backupData.data))

      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro na restauração:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken])

  // Função para obter ou criar pasta de backup (com cache)
  const getOrCreateBackupFolder = useCallback(async (): Promise<string | null> => {
    // Retorna cache se disponível
    if (folderIdRef.current) {
      return folderIdRef.current
    }

    const folderName = 'Finance Tracker Backups'
    
    try {
      // Primeiro, verifica se a pasta já existe
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
          }
        }
      )

      if (!searchResponse.ok) {
        console.error('Erro ao buscar pasta:', searchResponse.status)
        return null
      }

      const searchResult = await searchResponse.json()
      
      if (searchResult.files && searchResult.files.length > 0) {
        // Pasta já existe - salva no cache
        folderIdRef.current = searchResult.files[0].id
        return folderIdRef.current
      }

      // Pasta não existe, cria uma nova
      const createResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
          })
        }
      )

      if (!createResponse.ok) {
        console.error('Erro ao criar pasta:', createResponse.status)
        return null
      }

      const createResult = await createResponse.json()
      // Salva no cache
      folderIdRef.current = createResult.id
      return folderIdRef.current

    } catch (error) {
      console.error('Erro ao obter/criar pasta de backup:', error)
      return null
    }
  }, [session?.accessToken])

  // Função para verificar se arquivo já existe na pasta específica
  const checkIfFileExists = useCallback(async (fileName: string, folderId: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and '${folderId}' in parents`,
        {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
          }
        }
      )

      if (!response.ok) {
        console.error('Erro ao verificar arquivo existente:', response.status, response.statusText)
        return null
      }

      const result = await response.json()
      return result.files && result.files.length > 0 ? result.files[0].id : null

    } catch (error) {
      console.error('Erro ao verificar arquivo existente:', error)
      return null
    }
  }, [session?.accessToken])

  // Função para fazer upload de novo arquivo para a pasta específica
  const uploadFileToDrive = useCallback(async (data: any, fileName: string, folderId: string): Promise<boolean> => {
    try {
      const fileContent = JSON.stringify(data, null, 2)
      
      // Metadados do arquivo
      const metadata = {
        name: fileName,
        parents: [folderId]
      }

      // Criação do form data para upload multipart
      const form = new FormData()
      
      // Adiciona metadados
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      
      // Adiciona conteúdo do arquivo
      form.append('file', new Blob([fileContent], { type: 'application/json' }))

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
          },
          body: form
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro no upload:', response.status, response.statusText, errorText)
        return false
      }

      return true

    } catch (error) {
      console.error('Erro no upload para Google Drive:', error)
      return false
    }
  }, [session?.accessToken])

  // Função para atualizar arquivo existente
  const updateFileInDrive = useCallback(async (fileId: string, data: any): Promise<boolean> => {
    try {
      const fileContent = JSON.stringify(data, null, 2)
      
      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro na atualização:', response.status, response.statusText, errorText)
        return false
      }

      return true

    } catch (error) {
      console.error('Erro ao atualizar arquivo no Google Drive:', error)
      return false
    }
  }, [session?.accessToken])

  // Função para backup automático com debounce
  const autoBackup = useCallback(async (localStorageKey: string, fileName: string) => {
    // Só faz backup automático se estiver logado e não estiver carregando
    if (!session?.accessToken || isLoading) return

    // Implementa debounce para evitar backups excessivos
    const now = Date.now()
    const lastBackupTime = lastBackupTimeRef.current[localStorageKey] || 0
    
    if (now - lastBackupTime < BACKUP_DEBOUNCE_TIME) {
      console.log('Backup ignorado - muito recente')
      return
    }

    try {
      await syncLocalStorageToGoogleDrive(localStorageKey, fileName)
    } catch (error) {
      // Falha silenciosa no backup automático
      console.warn('Backup automático falhou:', error)
    }
  }, [session?.accessToken, isLoading, syncLocalStorageToGoogleDrive])

  // Função para listar backups disponíveis na pasta específica
  const listBackups = useCallback(async (): Promise<Array<{id: string, name: string, modifiedTime: string}>> => {
    if (!session?.accessToken) return []

    try {
      const folderId = await getOrCreateBackupFolder()
      if (!folderId) return []

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents&fields=files(id,name,modifiedTime)`,
        {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          }
        }
      )

      if (!response.ok) return []

      const result = await response.json()
      return result.files || []

    } catch (error) {
      console.error('Erro ao listar backups:', error)
      return []
    }
  }, [session?.accessToken, getOrCreateBackupFolder])

  // Função para limpar cache (útil em logout)
  const clearCache = useCallback(() => {
    folderIdRef.current = null
    lastBackupTimeRef.current = {}
  }, [])

  return {
    isLoading,
    error,
    syncLocalStorageToGoogleDrive,
    restoreFromGoogleDrive,
    autoBackup,
    listBackups,
    clearCache
  }
}