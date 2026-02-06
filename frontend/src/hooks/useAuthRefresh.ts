import { useEffect } from 'react'
import { refreshAccessToken } from '../api/auth'
import { useAuthStore } from '../store/authStore'

export const useAuthRefresh = () => {
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const setAccessToken = useAuthStore((state) => state.setAccessToken)
  const signOut = useAuthStore((state) => state.signOut)

  useEffect(() => {
    const handleExpired = () => signOut()
    window.addEventListener('auth:expired', handleExpired)

    const refresh = async () => {
      if (!refreshToken) return
      try {
        const { data } = await refreshAccessToken(refreshToken)
        setAccessToken(data.access)
      } catch {
        signOut()
      }
    }

    const interval = window.setInterval(refresh, 15 * 60 * 1000)
    return () => {
      window.removeEventListener('auth:expired', handleExpired)
      window.clearInterval(interval)
    }
  }, [refreshToken, setAccessToken, signOut])
}
