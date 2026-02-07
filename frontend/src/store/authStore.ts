import { create } from 'zustand'
import type { User } from '../types/api'

export const ACCESS_TOKEN_KEY = 'cloudpdf-access-token'
export const REFRESH_TOKEN_KEY = 'cloudpdf-refresh-token'

const sanitizeStoredToken = (value: string | null) =>
  value && value !== 'undefined' && value !== 'null' ? value : null

export const getStoredAccessToken = () => sanitizeStoredToken(localStorage.getItem(ACCESS_TOKEN_KEY))
export const getStoredRefreshToken = () => sanitizeStoredToken(localStorage.getItem(REFRESH_TOKEN_KEY))

type AuthState = {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setUser: (user: User | null) => void
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void
  setAccessToken: (accessToken: string | null) => void
  setRefreshToken: (refreshToken: string | null) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: getStoredAccessToken(),
  refreshToken: getStoredRefreshToken(),
  setUser: (user) => set({ user }),
  setTokens: ({ accessToken, refreshToken }) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    set({ accessToken, refreshToken })
  },
  setAccessToken: (accessToken) => {
    if (accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
    set({ accessToken })
  },
  setRefreshToken: (refreshToken) => {
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
    set({ refreshToken })
  },
  signOut: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    set({ user: null, accessToken: null, refreshToken: null })
  }
}))
