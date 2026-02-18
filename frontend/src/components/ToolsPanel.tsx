import { annotationsActions, useAnnotationsDispatch } from '../store/annotationsRedux'
import { useToastStore } from '../store/toastStore'
import { useUiStore } from '../store/uiStore'
import { useViewerStore } from '../store/viewerStore'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

const buildComingSoonToast = (title: string, description: string) => ({
  id: crypto.randomUUID(),
  title,
  description
})

export const ToolsPanel = () => {
  const dispatch = useAnnotationsDispatch()
  const pushToast = useToastStore((state) => state.push)
  const setRightPanelTab = useUiStore((state) => state.setRightPanelTab)
  const { zoom, setZoom } = useViewerStore()

  const activateTool = (tool: string, label: string) => {
    dispatch(annotationsActions.setActiveTool(tool))
    pushToast({
      id: crypto.randomUUID(),
      title: `${label} tool ready`,
      description: 'Use this tool directly on the document canvas.',
      tone: 'success'
    })
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pr-1">
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
          <Button variant="secondary" onClick={() => pushToast(buildComingSoonToast('Rotate page', 'Rotation action will be enabled in an upcoming update.'))}>Rotate</Button>
          <Button variant="secondary" onClick={() => pushToast(buildComingSoonToast('Delete page', 'Page deletion is not wired yet for this build.'))}>Delete</Button>
          <Button variant="secondary" onClick={() => pushToast(buildComingSoonToast('Insert page', 'Page insertion is coming soon.'))}>Insert</Button>
          <Button variant="secondary" onClick={() => pushToast(buildComingSoonToast('Extract pages', 'Page extraction is coming soon.'))}>Extract</Button>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Merge / Split</h3>
        <div className="rounded-lg border border-dashed border-surface-300 p-3 text-xs text-surface-500 dark:border-surface-700">
          Drag PDFs here to merge.
        </div>
        <Button variant="secondary" onClick={() => pushToast(buildComingSoonToast('Split by range', 'Split workflow is not yet connected.'))}>Split by range</Button>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Compression</h3>
        <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
          <div className="flex items-center justify-between">
            <span className="text-sm">Balanced preset</span>
            <Badge tone="accent">Est. 4.2MB</Badge>
          </div>
          <Button className="mt-3 w-full" onClick={() => pushToast(buildComingSoonToast('Compression queued', 'Compression workflow will be connected to backend jobs soon.'))}>Apply compression</Button>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Text Editing</h3>
        <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
          Select text to replace. Font matching enabled.
        </div>
        <Button variant="secondary" onClick={() => {
          setRightPanelTab('assistant')
          pushToast(buildComingSoonToast('Open AI Assistant', 'Use AI Assistant to draft rewrite suggestions for selected text.'))
        }}>Open assistant for rewrite</Button>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Image Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => activateTool('stamp', 'Stamp')}>Upload</Button>
          <Button variant="secondary" onClick={() => pushToast(buildComingSoonToast('Crop image', 'Image crop controls are coming soon.'))}>Crop</Button>
          <Button variant="secondary" onClick={() => pushToast(buildComingSoonToast('Replace image', 'Image replacement is coming soon.'))}>Replace</Button>
          <Button variant="secondary" onClick={() => pushToast(buildComingSoonToast('Resize image', 'Image resizing is coming soon.'))}>Resize</Button>
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
          Processing English (US) — 67%
          <div className="mt-2 h-2 w-full rounded-full bg-surface-200 dark:bg-surface-800">
            <div className="h-2 w-2/3 rounded-full bg-accent-600" />
          </div>
        </div>
        <Button variant="outline" onClick={() => pushToast(buildComingSoonToast('OCR language', 'Language switching is coming soon.'))}>Change language</Button>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Smart Redaction</h3>
        <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
          12 suggestions detected
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => activateTool('shape', 'Redaction shape')}>Review</Button>
            <Button size="sm" variant="secondary" onClick={() => pushToast(buildComingSoonToast('Batch apply', 'Batch redaction apply is coming soon.'))}>Batch apply</Button>
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Export</h3>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" variant="secondary" onClick={() => pushToast(buildComingSoonToast('Export Word', 'Word export from this panel is coming soon.'))}>Word</Button>
          <Button size="sm" variant="secondary" onClick={() => pushToast(buildComingSoonToast('Export Excel', 'Excel export from this panel is coming soon.'))}>Excel</Button>
          <Button size="sm" variant="secondary" onClick={() => pushToast(buildComingSoonToast('Export Images', 'Image export from this panel is coming soon.'))}>Images</Button>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Accessibility Check</h3>
        <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
          3 issues found in headings and tags.
          <Button size="sm" className="mt-2 w-full" onClick={() => pushToast(buildComingSoonToast('Accessibility report', 'Detailed accessibility report is coming soon.'))}>View report</Button>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Security</h3>
        <Input placeholder="Owner password" type="password" />
        <Input placeholder="User password" type="password" />
        <Button variant="outline" onClick={() => pushToast(buildComingSoonToast('Save permissions', 'Security permission save from panel is coming soon.'))}>Save permissions</Button>
      </section>
    </div>
  )
}
