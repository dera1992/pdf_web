import { Bell, ChevronDown, Search, Moon, Sun } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { useTheme } from '../hooks/useTheme'

export const TopBar = () => {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header className="flex items-center justify-between border-b border-surface-200 bg-white px-6 py-4 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
          Atlas Workspace
          <ChevronDown className="h-4 w-4" />
        </div>
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-surface-400" />
          <Input placeholder="Search documents, annotations, comments" className="w-72 pl-9" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" aria-label="Toggle theme" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-600" />
        </Button>
        <Button variant="secondary" className="gap-2">
          Olivia Rhye
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
