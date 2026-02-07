import axios from 'axios'
import { getStoredAccessToken, getStoredRefreshToken, useAuthStore } from '../store/authStore'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'

const apiClient = axios.create({
  baseURL,
  withCredentials: true
})

const refreshClient = axios.create({
  baseURL,
  withCredentials: true
})

let isRefreshing = false
let refreshPromise: Promise<string> | null = null

export const refreshTokenIfNeeded = async () => {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) {
    useAuthStore.getState().signOut()
    throw new Error('Missing refresh token.')
  }
  if (!isRefreshing) {
    isRefreshing = true
    refreshPromise = refreshClient
      .post<{ access: string; refresh?: string }>('/auth/token/refresh/', { refresh: refreshToken })
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.access)
        if (data.refresh) {
          useAuthStore.getState().setRefreshToken(data.refresh)
        }
        return data.access
      })
      .catch((refreshError) => {
        useAuthStore.getState().signOut()
        throw refreshError
      })
      .finally(() => {
        isRefreshing = false
      })
  }
  if (!refreshPromise) {
    throw new Error('Unable to refresh token.')
  }
  return refreshPromise
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean; headers: Record<string, string> })
      | undefined
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !String(originalRequest.url ?? '').includes('/auth/token/refresh/')
    ) {
      originalRequest._retry = true
      try {
        const newAccessToken = await refreshTokenIfNeeded()
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return apiClient(originalRequest)
      } catch {
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }
    }
    return Promise.reject(error)
  }
)

apiClient.interceptors.request.use((config) => {
  const token = getStoredAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
