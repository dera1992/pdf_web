import { useEffect } from 'react'
import { refreshTokenIfNeeded } from '../api/client'
import { useAuthStore } from '../store/authStore'

export const useAuthRefresh = () => {
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const signOut = useAuthStore((state) => state.signOut)

  useEffect(() => {
    const handleExpired = async () => {
      if (!refreshToken) {
        signOut()
        return
      }
      try {
        await refreshTokenIfNeeded()
      } catch {
        signOut()
      }
    }
    window.addEventListener('auth:expired', handleExpired)

    return () => {
      window.removeEventListener('auth:expired', handleExpired)
    }
  }, [refreshToken, signOut])
}
