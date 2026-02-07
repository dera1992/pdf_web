import { motion, AnimatePresence } from 'framer-motion'
import { ToolsPanel } from './ToolsPanel'
import { AssistantPanel } from './AssistantPanel'
import { useUiStore } from '../store/uiStore'

export const RightPanel = () => {
  const { rightPanelTab, setRightPanelTab } = useUiStore()

  return (
    <aside className="flex h-full w-80 flex-col border-l border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
      <div className="flex gap-2 rounded-lg bg-surface-100 p-1 text-xs font-semibold text-surface-500 dark:bg-surface-800">
        <button
          className={`flex-1 rounded-md px-3 py-2 ${rightPanelTab === 'tools' ? 'bg-white text-surface-900 dark:bg-surface-900 dark:text-surface-50' : ''}`}
          onClick={() => setRightPanelTab('tools')}
        >
          Tools
        </button>
        <button
          className={`flex-1 rounded-md px-3 py-2 ${rightPanelTab === 'assistant' ? 'bg-white text-surface-900 dark:bg-surface-900 dark:text-surface-50' : ''}`}
          onClick={() => setRightPanelTab('assistant')}
        >
          AI Assistant
        </button>
      </div>
      <div className="mt-4 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {rightPanelTab === 'tools' ? (
            <motion.div key="tools" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <ToolsPanel />
            </motion.div>
          ) : (
            <motion.div key="assistant" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <AssistantPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}
