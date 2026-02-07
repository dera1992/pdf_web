import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AnnotationToolbar } from '../components/AnnotationToolbar'
import { DocumentBreadcrumbs } from '../components/DocumentBreadcrumbs'
import { LeftPanel } from '../components/LeftPanel'
import { RightPanel } from '../components/RightPanel'
import { ViewerTopBar } from '../components/ViewerTopBar'
import { useAiStore } from '../store/aiStore'
import { useUiStore } from '../store/uiStore'
import { useViewerStore } from '../store/viewerStore'

export const EditorLayout = () => {
  const { page } = useViewerStore()
  const { setSelectedText, setSelectedPageRange, setDraftPrompt, triggerInputFocus } = useAiStore()
  const { setRightPanelTab, setRightPanelOpen } = useUiStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    window.addEventListener('scroll', handleClick, true)
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('scroll', handleClick, true)
    }
  }, [])

  const getPageFromNode = (node: Node | null) => {
    if (!node) return null
    let element = node instanceof Element ? node : node.parentElement
    while (element && !element.dataset.pageNumber) {
      element = element.parentElement
    }
    if (!element?.dataset.pageNumber) return null
    const value = Number(element.dataset.pageNumber)
    return Number.isNaN(value) ? null : value
  }

  const captureSelection = () => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim() ?? ''
    if (!selectedText) {
      setSelectedText('')
      setSelectedPageRange('')
      return
    }
    const anchorPage = getPageFromNode(selection?.anchorNode ?? null)
    const focusPage = getPageFromNode(selection?.focusNode ?? null)
    const pages = [anchorPage, focusPage].filter((value): value is number => typeof value === 'number')
    const minPage = pages.length > 0 ? Math.min(...pages) : page
    const maxPage = pages.length > 0 ? Math.max(...pages) : page
    const pageRange = minPage === maxPage ? `${minPage}` : `${minPage}-${maxPage}`
    setSelectedText(selectedText)
    setSelectedPageRange(pageRange)
  }

  const handleAskSelection = () => {
    setRightPanelTab('assistant')
    setRightPanelOpen(true)
    setDraftPrompt('What does this selection mean?')
    triggerInputFocus()
    setContextMenu(null)
  }

  return (
    <div className="flex h-screen flex-col bg-surface-50 text-surface-900 dark:bg-surface-950">
      <div className="flex items-center justify-between border-b border-surface-200 bg-white px-6 py-3 dark:border-surface-800 dark:bg-surface-900">
        <DocumentBreadcrumbs />
        <div className="text-xs text-surface-500">Auto-saved 2 minutes ago</div>
      </div>
      <AnnotationToolbar />
      <ViewerTopBar />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel />
        <div
          className="relative flex flex-1 items-center justify-center overflow-auto bg-surface-100 p-6 dark:bg-surface-900"
          onMouseUp={captureSelection}
          onContextMenu={(event) => {
            captureSelection()
            const selection = window.getSelection()?.toString().trim()
            if (selection) {
              event.preventDefault()
              const rect = event.currentTarget.getBoundingClientRect()
              setContextMenu({ x: event.clientX - rect.left, y: event.clientY - rect.top })
            }
          }}
        >
          <Outlet />
          {contextMenu && (
            <div
              className="absolute z-40 w-48 rounded-lg border border-surface-200 bg-white p-2 text-xs shadow-card dark:border-surface-700 dark:bg-surface-900"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                className="w-full rounded-md px-2 py-1 text-left text-surface-700 hover:bg-surface-100 dark:text-surface-200 dark:hover:bg-surface-800"
                onClick={handleAskSelection}
              >
                Ask about selection
              </button>
            </div>
          )}
        </div>
        <RightPanel />
      </div>
    </div>
  )
}
