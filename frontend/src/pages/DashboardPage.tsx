import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { JobPanel } from '../components/JobPanel'

const stats = [
  { label: 'Active workspaces', value: '4' },
  { label: 'Documents this week', value: '128' },
  { label: 'Pending exports', value: '6' },
  { label: 'Active collaborators', value: '19' }
]

const recentDocs = [
  { title: 'Q3 Financial Report', status: 'Ready', updated: '2h ago' },
  { title: 'Vendor Agreement', status: 'Review', updated: '4h ago' },
  { title: 'Product Requirements', status: 'Processing', updated: '1d ago' }
]

export const DashboardPage = () => {
  const navigate = useNavigate()
  const [documentId, setDocumentId] = useState('')

  const handleOpenDocument = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = documentId.trim()
    if (!trimmed) return
    navigate(`/document/${trimmed}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-surface-500">Monitor collaboration and document health.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="text-xs text-surface-500">{stat.label}</div>
            <div className="mt-2 text-2xl font-semibold text-surface-900 dark:text-surface-50">{stat.value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Open a document</h2>
            <p className="text-sm text-surface-500">Jump straight to a document by ID.</p>
          </div>
          <form className="flex w-full max-w-md gap-2" onSubmit={handleOpenDocument}>
            <input
              className="flex-1 rounded-md border border-surface-200 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:border-surface-800 dark:bg-surface-950 dark:text-surface-50"
              placeholder="Enter document ID"
              value={documentId}
              onChange={(event) => setDocumentId(event.target.value)}
            />
            <button
              type="submit"
              className="rounded-md bg-accent-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-700"
            >
              Open
            </button>
          </form>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Documents</h2>
          <Badge tone="accent">Live</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {recentDocs.map((doc) => (
            <div
              key={doc.title}
              className="flex items-center justify-between rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-800"
            >
              <div>
                <div className="text-sm font-semibold">{doc.title}</div>
                <div className="text-xs text-surface-500">Updated {doc.updated}</div>
              </div>
              <Badge>{doc.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Job Tracking</h2>
        <p className="text-sm text-surface-500">Monitor OCR, export, and operations.</p>
        <div className="mt-4">
          <JobPanel />
        </div>
      </Card>
    </div>
  )
}
