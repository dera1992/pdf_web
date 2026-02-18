import { useNavigate } from 'react-router-dom'
import { operationsApi } from '../api/operations'
import { pdfToolsApi } from '../api/pdfTools'
import { annotationsActions, useAnnotationsDispatch } from '../store/annotationsRedux'
import { useDocumentStore } from '../store/documentStore'
import { useToastStore } from '../store/toastStore'
import { useUiStore } from '../store/uiStore'
import { useViewerStore } from '../store/viewerStore'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

const buildInfoToast = (title: string, description: string) => ({
  id: crypto.randomUUID(),
  title,
  description
})

export const ToolsPanel = () => {
  const navigate = useNavigate()
  const dispatch = useAnnotationsDispatch()
  const pushToast = useToastStore((state) => state.push)
  const setRightPanelTab = useUiStore((state) => state.setRightPanelTab)
  const { zoom, setZoom, page } = useViewerStore()
  const activeVersionId = useDocumentStore((state) => state.activeVersionId)
  const activeDocument = useDocumentStore((state) => state.activeDocument)

  const getOperationContext = () => {
    if (!activeVersionId || !activeDocument?.workspace) {
      pushToast({
        id: crypto.randomUUID(),
        title: 'No active version',
        description: 'Open a document version to use this tool.',
        tone: 'error'
      })
      return null
    }
    return { workspace: activeDocument.workspace, versionId: activeVersionId }
  }

  const requireVersionId = () => {
    if (activeVersionId) return activeVersionId
    pushToast({
      id: crypto.randomUUID(),
      title: 'No active version',
      description: 'Open a document version to use this tool.',
      tone: 'error'
    })
    return null
  }

  const openTool = (toolId: string) => {
    const versionId = requireVersionId()
    if (!versionId) return
    navigate(`/tools/${toolId}?versionId=${encodeURIComponent(versionId)}`)
  }

  const activateTool = (tool: string, label: string) => {
    dispatch(annotationsActions.setActiveTool(tool))
    pushToast({
      id: crypto.randomUUID(),
      title: `${label} tool ready`,
      description: 'Use this tool directly on the document canvas.',
      tone: 'success'
    })
  }

  const queueOperation = async (
    operation: 'rotate' | 'deletePages' | 'merge' | 'split' | 'compress',
    successTitle: string,
    params: Record<string, unknown>
  ) => {
    const context = getOperationContext()
    if (!context) return

    try {
      const basePayload = {
        workspace: context.workspace,
        version_ids: [context.versionId],
        ...params
      }

      const job =
        operation === 'rotate'
          ? await operationsApi.rotate(basePayload)
          : operation === 'deletePages'
            ? await operationsApi.deletePages(basePayload)
            : operation === 'merge'
              ? await operationsApi.merge(basePayload)
              : operation === 'split'
                ? await operationsApi.split(basePayload)
                : await operationsApi.compress(basePayload)

      pushToast({
        id: crypto.randomUUID(),
        title: successTitle,
        description: `Operation job #${job.id} is running.`,
        tone: 'success'
      })
    } catch {
      pushToast({
        id: crypto.randomUUID(),
        title: `${successTitle} failed`,
        description: 'Unable to queue this operation right now.',
        tone: 'error'
      })
    }
  }

  const queueConversion = async (target: 'word' | 'excel' | 'jpg') => {
    const versionId = requireVersionId()
    if (!versionId) return

    try {
      const job =
        target === 'word'
          ? await pdfToolsApi.convertVersionToWord(versionId)
          : target === 'excel'
            ? await pdfToolsApi.convertVersionToExcel(versionId)
            : await pdfToolsApi.convertVersionToJpg(versionId)

      pushToast({
        id: crypto.randomUUID(),
        title: `${target.toUpperCase()} export queued`,
        description: `Job #${job.data.id} is processing.`,
        tone: 'success'
      })
    } catch {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Export failed',
        description: `Unable to queue ${target.toUpperCase()} export right now.`,
        tone: 'error'
      })
    }
  }


  const cropCurrentPage = async () => {
    const versionId = requireVersionId()
    if (!versionId) return

    try {
      const response = await pdfToolsApi.crop(versionId, {
        page_range: String(page),
        coordinates: { x: 10, y: 10, w: 500, h: 700 }
      })
      pushToast({
        id: crypto.randomUUID(),
        title: 'Image crop queued',
        description: `Crop job #${response.data.id} is processing for page ${page}.`,
        tone: 'success'
      })
    } catch {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Crop failed',
        description: 'Unable to queue crop right now.',
        tone: 'error'
      })
    }
  }

  const startOcr = async () => {
    const versionId = requireVersionId()
    if (!versionId) return

    try {
      await pdfToolsApi.startOcr(versionId, { language: 'eng' })
      pushToast({
        id: crypto.randomUUID(),
        title: 'OCR queued',
        description: 'OCR processing started for this version.',
        tone: 'success'
      })
    } catch {
      pushToast({
        id: crypto.randomUUID(),
        title: 'OCR failed',
        description: 'Unable to start OCR right now.',
        tone: 'error'
      })
    }
  }

  const suggestRedactions = async () => {
    const versionId = requireVersionId()
    if (!versionId) return

    try {
      await pdfToolsApi.suggestRedactions(versionId)
      pushToast({
        id: crypto.randomUUID(),
        title: 'Redaction suggestions queued',
        description: 'AI is generating redaction suggestions for this version.',
        tone: 'success'
      })
    } catch {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Suggestion failed',
        description: 'Unable to queue redaction suggestions.',
        tone: 'error'
      })
    }
  }

  const runAccessibilityCheck = async () => {
    const versionId = requireVersionId()
    if (!versionId) return

    try {
      const { data } = await pdfToolsApi.getLayout(versionId)
      const layout = data.layout
      const pages = Array.isArray(layout)
        ? (layout.length > 0 ? 1 : 0)
        : Object.keys(layout ?? {}).length
      const hasAnyText = Array.isArray(layout)
        ? layout.length > 0
        : Object.values(layout ?? {}).some(
            (value) => Array.isArray(value) && value.length > 0
          )
      const issues = []
      if (pages === 0) issues.push('No layout pages detected')
      if (!hasAnyText) issues.push('No extracted text blocks found')

      if (issues.length === 0) {
        pushToast({
          id: crypto.randomUUID(),
          title: 'Accessibility check passed',
          description: `Scanned ${pages} page(s) and found readable text structure.`,
          tone: 'success'
        })
      } else {
        pushToast(buildInfoToast('Accessibility report', `${issues.join(' · ')}.`))
      }
    } catch {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Accessibility check failed',
        description: 'Unable to read layout data for this version.',
        tone: 'error'
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Quick annotate</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => activateTool('highlight', 'Highlight')}>Highlight</Button>
          <Button variant="secondary" onClick={() => activateTool('underline', 'Underline')}>Underline</Button>
          <Button variant="secondary" onClick={() => activateTool('note', 'Sticky note')}>Sticky note</Button>
          <Button variant="secondary" onClick={() => activateTool('draw', 'Freehand')}>Freehand</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Page Management</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void queueOperation('rotate', 'Rotate queued', { page, degrees: 90 })}>Rotate</Button>
          <Button variant="secondary" onClick={() => void queueOperation('deletePages', 'Delete queued', { pages: [page] })}>Delete</Button>
          <Button variant="secondary" onClick={() => void queueOperation('merge', 'Insert queued', { position: page })}>Insert</Button>
          <Button variant="secondary" onClick={() => void queueOperation('split', 'Extract queued', { ranges: [{ from: page, to: page }] })}>Extract</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Merge / Split</h3>
        <div className="rounded-lg border border-dashed border-surface-300 p-3 text-xs text-surface-500 dark:border-surface-700">
          Use Merge or Split to create a new document version from current pages.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void queueOperation('merge', 'Merge queued', {})}>Merge</Button>
          <Button variant="secondary" onClick={() => void queueOperation('split', 'Split queued', { ranges: [{ from: 1, to: page }] })}>Split by range</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Compression</h3>
        <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <span className="text-sm">Balanced preset</span>
            <Badge tone="accent">Est. 4.2MB</Badge>
          </div>
          <Button className="mt-3 w-full" onClick={() => void queueOperation('compress', 'Compression queued', { preset: 'balanced' })}>Apply compression</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Text Editing</h3>
        <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
          Select text to replace. Font matching enabled.
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button variant="secondary" onClick={() => openTool('edit-text')}>Open edit text tool</Button>
          <Button variant="secondary" onClick={() => {
            setRightPanelTab('assistant')
            pushToast(buildInfoToast('Open AI Assistant', 'Use AI Assistant to draft rewrite suggestions for selected text.'))
          }}>Open assistant for rewrite</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Image Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => activateTool('stamp', 'Image stamp')}>Upload</Button>
          <Button variant="secondary" onClick={() => void cropCurrentPage()}>Crop</Button>
          <Button variant="secondary" onClick={() => activateTool('stamp', 'Replace image')}>Replace</Button>
          <Button variant="secondary" onClick={() => activateTool('select', 'Resize image')}>Resize</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Viewer quick controls</h3>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" variant="secondary" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>- Zoom</Button>
          <Button size="sm" variant="secondary" onClick={() => setZoom(1)}>100%</Button>
          <Button size="sm" variant="secondary" onClick={() => setZoom(Math.min(5, zoom + 0.1))}>+ Zoom</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">OCR Status</h3>
        <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
          Run OCR to improve text extraction and search quality.
        </div>
        <Button variant="outline" onClick={() => void startOcr()}>Start OCR (English)</Button>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Smart Redaction</h3>
        <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
          Generate AI redaction suggestions, then open redact tool to review and apply.
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => void suggestRedactions()}>Suggest</Button>
            <Button size="sm" variant="secondary" onClick={() => openTool('redact')}>Review</Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Export</h3>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" variant="secondary" onClick={() => void queueConversion('word')}>Word</Button>
          <Button size="sm" variant="secondary" onClick={() => void queueConversion('excel')}>Excel</Button>
          <Button size="sm" variant="secondary" onClick={() => void queueConversion('jpg')}>Images</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Accessibility Check</h3>
        <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
          Run a quick layout/text-structure check on the current version.
          <Button size="sm" className="mt-2 w-full" onClick={() => void runAccessibilityCheck()}>View report</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Security</h3>
        <Input placeholder="Owner password" type="password" />
        <Input placeholder="User password" type="password" />
        <Button variant="outline" onClick={() => openTool('share')}>Share settings</Button>
      </section>
    </div>
  )
}
