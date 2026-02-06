import { Minus, Plus, Maximize2, Minimize2, Sun, Moon } from 'lucide-react'
import { useViewerStore } from '../store/viewerStore'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

export const ViewerTopBar = () => {
  const { zoom, setZoom, darkMode, toggleDarkMode, mode, setMode, page, setPage } = useViewerStore()

  return (
    <div className="flex items-center justify-between border-b border-surface-200 bg-white px-4 py-2 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center gap-2">
        <Button title="Zoom out" variant="ghost" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-surface-600">{Math.round(zoom * 100)}%</span>
        <Button title="Zoom in" variant="ghost" onClick={() => setZoom(Math.min(5, zoom + 0.1))}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button title="Fit page" variant="ghost" onClick={() => setZoom(1)}>
          <Minimize2 className="h-4 w-4" />
          Fit page
        </Button>
        <Button title="Fit width" variant="ghost" onClick={() => setZoom(1.4)}>
          <Maximize2 className="h-4 w-4" />
          Fit width
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-xs text-surface-500">
          <span>Page</span>
          <Input
            className="h-8 w-16 text-center"
            value={page}
            onChange={(event) => setPage(Number(event.target.value || 1))}
          />
        </div>
        <select
          className="rounded-md border border-surface-200 bg-white px-2 py-1 text-xs dark:border-surface-700 dark:bg-surface-900"
          value={mode}
          onChange={(event) => setMode(event.target.value as 'single' | 'continuous' | 'two-up')}
        >
          <option value="single">Single page</option>
          <option value="continuous">Continuous</option>
          <option value="two-up">Two-up</option>
        </select>
        <Button title="Toggle reader mode" variant="ghost" onClick={toggleDarkMode}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          Dark mode
        </Button>
      </div>
    </div>
  )
}
