// service/useGoogleDriveSync.ts
import { useState } from 'react'
import { useSession } from 'next-auth/react'

export function useGoogleDriveSync() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncLocalStorageToGoogleDrive = async (
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

      // 4. Verifica se já existe um arquivo com esse nome
      const existingFileId = await checkIfFileExists(fileName)

      let response
      if (existingFileId) {
        // Atualiza arquivo existente
        response = await updateFileInDrive(existingFileId, backupData)
      } else {
        // Cria novo arquivo
        response = await uploadFileToDrive(backupData, fileName)
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro no upload')
      }

      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro no backup:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const restoreFromGoogleDrive = async (
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
      // 1. Faz download do arquivo do Google Drive
      const response = await fetch(`/api/drive/download?fileName=${encodeURIComponent(fileName)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro no download')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.message || 'Falha no download')
      }

      // 2. Verifica se os dados têm a estrutura esperada 
      const backupData = result.data
      if (!backupData || !backupData.data) {
        throw new Error('Arquivo de backup inválido')
      }

      // 3. Salva no localStorage
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
  }

  // Função para verificar se arquivo já existe
  const checkIfFileExists = async (fileName: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and parents in 'appDataFolder'&spaces=appDataFolder`,
        {
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
          }
        }
      )

      if (!response.ok) return null

      const result = await response.json()
      return result.files && result.files.length > 0 ? result.files[0].id : null

    } catch (error) {
      console.error('Erro ao verificar arquivo existente:', error)
      return null
    }
  }

  // Função para fazer upload de novo arquivo
  const uploadFileToDrive = async (data: any, fileName: string) => {
    return fetch('/api/drive/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: data,
        fileName: fileName
      })
    })
  }

  // Função para atualizar arquivo existente
  const updateFileInDrive = async (fileId: string, data: any) => {
    const fileContent = JSON.stringify(data, null, 2)
    
    return fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session?.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: fileContent
    })
  }

  // Função para backup automático
  const autoBackup = async (localStorageKey: string, fileName: string) => {
    // Só faz backup automático se estiver logado e não estiver carregando
    if (!session?.accessToken || isLoading) return

    try {
      await syncLocalStorageToGoogleDrive(localStorageKey, fileName)
    } catch (error) {
      // Falha silenciosa no backup automático
      console.warn('Backup automático falhou:', error)
    }
  }

  return {
    isLoading,
    error,
    syncLocalStorageToGoogleDrive,
    restoreFromGoogleDrive,
    autoBackup
  }
}