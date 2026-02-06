import { useEffect } from 'react'
import apiClient from '../api/client'
import { useAuthStore } from '../store/authStore'

export const useAuthRefresh = () => {
  const setToken = useAuthStore((state) => state.setToken)

  useEffect(() => {
    const refresh = async () => {
      try {
        const { data } = await apiClient.post<{ token: string }>('/auth/refresh')
        setToken(data.token)
      } catch {
        setToken(null)
      }
    }

    const interval = window.setInterval(refresh, 15 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [setToken])
}
