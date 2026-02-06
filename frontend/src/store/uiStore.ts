import { create } from 'zustand'

type UiState = {
  sidebarOpen: boolean
  rightPanelOpen: boolean
  toggleSidebar: () => void
  toggleRightPanel: () => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  rightPanelOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen }))
}))
