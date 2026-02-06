import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const storageKey = 'cloudpdf-theme'

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>('system')

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as ThemeMode | null
    if (stored) {
      setTheme(stored)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
    root.classList.toggle('dark', isDark)
    localStorage.setItem(storageKey, theme)
  }, [theme])

  return { theme, setTheme }
}
