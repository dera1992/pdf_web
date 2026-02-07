import { create } from 'zustand'

type UiState = {
  sidebarOpen: boolean
  rightPanelOpen: boolean
  rightPanelTab: 'tools' | 'assistant'
  toggleSidebar: () => void
  toggleRightPanel: () => void
  setRightPanelOpen: (value: boolean) => void
  setRightPanelTab: (tab: 'tools' | 'assistant') => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: true,
  rightPanelTab: 'tools',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),
  setRightPanelTab: (rightPanelTab) => set({ rightPanelTab })
}))
