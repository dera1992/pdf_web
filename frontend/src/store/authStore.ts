import { create } from 'zustand'
import type { User } from '../types/api'

const tokenKey = 'cloudpdf-token'

type AuthState = {
  user: User | null
  token: string | null
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(tokenKey),
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem(tokenKey, token)
    } else {
      localStorage.removeItem(tokenKey)
    }
    set({ token })
  },
  signOut: () => {
    localStorage.removeItem(tokenKey)
    set({ user: null, token: null })
  }
}))
