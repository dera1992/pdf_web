import {
  MousePointer2,
  Pencil,
  Highlighter,
  Underline,
  Strikethrough,
  StickyNote,
  Shapes,
  Stamp,
  PenTool,
  FormInput,
  Undo2,
  Redo2
} from 'lucide-react'
import { useAnnotationStore } from '../store/annotationStore'
import { cn } from '../utils/cn'

const tools = [
  { key: 'select', label: 'Select', icon: MousePointer2 },
  { key: 'highlight', label: 'Highlight', icon: Highlighter },
  { key: 'underline', label: 'Underline', icon: Underline },
  { key: 'strike', label: 'Strikethrough', icon: Strikethrough },
  { key: 'draw', label: 'Freehand', icon: Pencil },
  { key: 'note', label: 'Sticky note', icon: StickyNote },
  { key: 'shape', label: 'Shapes', icon: Shapes },
  { key: 'stamp', label: 'Stamp', icon: Stamp },
  { key: 'signature', label: 'Signature', icon: PenTool },
  { key: 'form', label: 'Form field', icon: FormInput }
]

export const AnnotationToolbar = () => {
  const activeTool = useAnnotationStore((state) => state.activeTool)
  const setActiveTool = useAnnotationStore((state) => state.setActiveTool)

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-surface-200 bg-white px-4 py-2 dark:border-surface-800 dark:bg-surface-900">
      <button
        title="Undo"
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800"
      >
        <Undo2 className="h-3.5 w-3.5" /> Undo
      </button>
      <button
        title="Redo"
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-surface-600 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800"
      >
        <Redo2 className="h-3.5 w-3.5" /> Redo
      </button>
      {tools.map((tool) => {
        const Icon = tool.icon
        const isActive = activeTool === tool.key
        return (
          <button
            key={tool.key}
            title={tool.label}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-surface-600 transition hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800',
              isActive && 'bg-accent-600 text-white hover:bg-accent-700'
            )}
            onClick={() => setActiveTool(tool.key)}
          >
            <Icon className="h-3.5 w-3.5" />
            {tool.label}
          </button>
        )
      })}
    </div>
  )
}
