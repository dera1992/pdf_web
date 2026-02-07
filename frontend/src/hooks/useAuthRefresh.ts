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

    const refresh = async () => {
      if (!refreshToken) return
      try {
        await refreshTokenIfNeeded()
      } catch {
        signOut()
      }
    }

    void refresh()
    const interval = window.setInterval(refresh, 15 * 60 * 1000)
    return () => {
      window.removeEventListener('auth:expired', handleExpired)
      window.clearInterval(interval)
    }
  }, [refreshToken, signOut])
}
