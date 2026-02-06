import { ReactNode } from 'react'
import { useTheme } from '../hooks/useTheme'

type ThemeProviderProps = {
  children: ReactNode
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  useTheme()
  return <>{children}</>
}
