import { useEffect } from 'react'
import { useViewerStore } from '../store/viewerStore'

export const useKeyboardShortcuts = () => {
  const { zoom, setZoom, page, setPage } = useViewerStore()

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === '+' || event.key === '=') {
          event.preventDefault()
          setZoom(Math.min(5, zoom + 0.1))
        }
        if (event.key === '-') {
          event.preventDefault()
          setZoom(Math.max(0.5, zoom - 0.1))
        }
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
  }, [page, setPage, setZoom, zoom])
}
