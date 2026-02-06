import axios from 'axios'
import { getStoredAccessToken } from '../store/authStore'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  withCredentials: true
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'))
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
