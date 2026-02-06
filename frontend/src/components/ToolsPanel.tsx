import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

export const ToolsPanel = () => (
  <div className="flex flex-col gap-6">
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Page Management</h3>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary">Rotate</Button>
        <Button variant="secondary">Delete</Button>
        <Button variant="secondary">Insert</Button>
        <Button variant="secondary">Extract</Button>
      </div>
    </section>
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Merge / Split</h3>
      <div className="rounded-lg border border-dashed border-surface-300 p-3 text-xs text-surface-500 dark:border-surface-700">
        Drag PDFs here to merge.
      </div>
      <Button variant="secondary">Split by range</Button>
    </section>
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Compression</h3>
      <div className="rounded-lg border border-surface-200 p-3 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <span className="text-sm">Balanced preset</span>
          <Badge tone="accent">Est. 4.2MB</Badge>
        </div>
        <Button className="mt-3 w-full">Apply compression</Button>
      </div>
    </section>
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Text Editing</h3>
      <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
        Select text to replace. Font matching enabled.
      </div>
      <Button variant="secondary">Save as new version</Button>
    </section>
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Image Tools</h3>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary">Upload</Button>
        <Button variant="secondary">Crop</Button>
        <Button variant="secondary">Replace</Button>
        <Button variant="secondary">Resize</Button>
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
      <Button variant="outline">Change language</Button>
    </section>
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Smart Redaction</h3>
      <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
        12 suggestions detected
        <div className="mt-2 flex gap-2">
          <Button size="sm">Review</Button>
          <Button size="sm" variant="secondary">Batch apply</Button>
        </div>
      </div>
    </section>
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Export</h3>
      <div className="grid grid-cols-3 gap-2">
        <Button size="sm" variant="secondary">Word</Button>
        <Button size="sm" variant="secondary">Excel</Button>
        <Button size="sm" variant="secondary">Images</Button>
      </div>
    </section>
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Accessibility Check</h3>
      <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
        3 issues found in headings and tags.
        <Button size="sm" className="mt-2 w-full">View report</Button>
      </div>
    </section>
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Security</h3>
      <Input placeholder="Owner password" type="password" />
      <Input placeholder="User password" type="password" />
      <Button variant="outline">Save permissions</Button>
    </section>
  </div>
)
