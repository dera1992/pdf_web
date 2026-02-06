import { create } from 'zustand'

export type Toast = {
  id: string
  title: string
  description?: string
  tone?: 'default' | 'success' | 'error'
}

type ToastState = {
  toasts: Toast[]
  push: (toast: Toast) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => set((state) => ({ toasts: [...state.toasts, toast] })),
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}))
