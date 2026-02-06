import { create } from 'zustand'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type AiState = {
  messages: ChatMessage[]
  isLoading: boolean
  addMessage: (message: ChatMessage) => void
  setLoading: (value: boolean) => void
}

export const useAiStore = create<AiState>((set) => ({
  messages: [],
  isLoading: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (isLoading) => set({ isLoading })
}))
