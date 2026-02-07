import { create } from 'zustand'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  intent?: 'question' | 'summary' | 'explain'
  citations?: {
    id: string
    page: number
    label: string
  }[]
  supportingText?: string[]
}

type AiState = {
  messages: ChatMessage[]
  isLoading: boolean
  error?: string | null
  canUseAi: boolean
  usesExternalAi: boolean
  selectedText: string
  selectedPageRange: string
  draftPrompt: string
  lastRequest?: { intent: 'question' | 'summary' | 'explain'; prompt: string } | null
  focusInputToken: number
  addMessage: (message: ChatMessage) => void
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
  setPermissions: (value: { canUseAi: boolean; usesExternalAi: boolean }) => void
  setSelectedText: (value: string) => void
  setSelectedPageRange: (value: string) => void
  setDraftPrompt: (value: string) => void
  setLastRequest: (value: AiState['lastRequest']) => void
  triggerInputFocus: () => void
  clearSelection: () => void
}

export const useAiStore = create<AiState>((set) => ({
  messages: [],
  isLoading: false,
  error: null,
  canUseAi: true,
  usesExternalAi: true,
  selectedText: '',
  selectedPageRange: '',
  draftPrompt: '',
  lastRequest: null,
  focusInputToken: 0,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPermissions: ({ canUseAi, usesExternalAi }) => set({ canUseAi, usesExternalAi }),
  setSelectedText: (selectedText) => set({ selectedText }),
  setSelectedPageRange: (selectedPageRange) => set({ selectedPageRange }),
  setDraftPrompt: (draftPrompt) => set({ draftPrompt }),
  setLastRequest: (lastRequest) => set({ lastRequest }),
  triggerInputFocus: () => set((state) => ({ focusInputToken: state.focusInputToken + 1 })),
  clearSelection: () => set({ selectedText: '', selectedPageRange: '' })
}))
