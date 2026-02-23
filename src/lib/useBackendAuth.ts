import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import api from './api'


export function useBackendAuth() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.idToken) return

    // Se já tem token válido, não precisa refazer login
    const existing = api.getToken()
    if (existing) return

    api.loginWithGoogle(session.idToken)
      .then((data) => {
        console.log('Backend autenticado:', data.user.email)
      })
      .catch((err) => {
        console.error('Erro ao autenticar no backend:', err.message)
      })
  }, [session?.idToken])
}