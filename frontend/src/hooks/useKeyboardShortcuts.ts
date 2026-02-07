import { useEffect } from 'react'
import { useAiStore } from '../store/aiStore'
import { useUiStore } from '../store/uiStore'
import { useViewerStore } from '../store/viewerStore'

export const useKeyboardShortcuts = () => {
  const { zoom, setZoom, page, setPage } = useViewerStore()
  const { triggerInputFocus } = useAiStore()
  const { setRightPanelTab, setRightPanelOpen } = useUiStore()

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditable =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.getAttribute('contenteditable') === 'true'
      if (event.metaKey || event.ctrlKey) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault()
          setZoom(Math.min(5, zoom + 0.1))
        }
        if (event.key === '-') {
          event.preventDefault()
          setZoom(Math.max(0.5, zoom - 0.1))
        }
        if (event.key.toLowerCase() === 'k') {
          event.preventDefault()
          setRightPanelTab('assistant')
          setRightPanelOpen(true)
          triggerInputFocus()
        }
      }
      if (!isEditable && event.key === '/') {
        event.preventDefault()
        setRightPanelTab('assistant')
        setRightPanelOpen(true)
        triggerInputFocus()
      }
      if (event.key === 'ArrowRight') {
        setPage(page + 1)
      }
      if (event.key === 'ArrowLeft') {
        setPage(Math.max(1, page - 1))
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [page, setPage, setRightPanelOpen, setRightPanelTab, setZoom, triggerInputFocus, zoom])
}
