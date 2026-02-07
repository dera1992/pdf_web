import { create } from 'zustand'

type ViewerState = {
  zoom: number
  page: number
  pageCount: number
  mode: 'single' | 'continuous' | 'two-up'
  darkMode: boolean
  setZoom: (zoom: number) => void
  setPage: (page: number) => void
  setPageCount: (count: number) => void
  setMode: (mode: ViewerState['mode']) => void
  toggleDarkMode: () => void
}

export const useViewerStore = create<ViewerState>((set) => ({
  zoom: 1,
  page: 1,
  pageCount: 1,
  mode: 'continuous',
  darkMode: false,
  setZoom: (zoom) => set({ zoom }),
  setPage: (page) => set({ page }),
  setPageCount: (pageCount) => set({ pageCount }),
  setMode: (mode) => set({ mode }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode }))
}))
