import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import api from './api'

interface ExtendedSession extends Session {
  idToken?: string
}

export function useBackendAuth() {
  const { data: session } = useSession()
  const extSession = session as ExtendedSession | null

  useEffect(() => {
    if (!extSession?.idToken) return

    const existing = api.getToken()
    if (existing) return

    api.loginWithGoogle(extSession.idToken)
      .then((data) => {
        console.log('Backend autenticado:', data.user.email)
      })
      .catch((err) => {
        console.error('Erro ao autenticar no backend:', err.message)
      })
  }, [extSession?.idToken])
}