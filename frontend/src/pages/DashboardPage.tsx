import { type DragEvent, type ChangeEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useAuthStore } from '../store/authStore'
import { useToastStore } from '../store/toastStore'
import { useWorkspaces } from '../hooks/useWorkspaces'
import { workspacesApi } from '../api/workspaces'
import { documentsApi } from '../api/documents'

const recentDocs = [
  {
    title: 'Q3 Financial Report',
    status: 'Ready',
    updated: '2 hours ago',
    collaborators: ['Elliot B.', 'Marco L.', 'Priya S.']
  },
  {
    title: 'Vendor Agreement',
    status: 'Review',
    updated: 'Yesterday · 4:12 PM',
    collaborators: ['Avery K.', 'Talia W.']
  },
  {
    title: 'Product Requirements',
    status: 'Processing',
    updated: 'Oct 2 · 9:07 AM',
    collaborators: ['Samir R.', 'Noah T.', 'Li Z.', 'Camila J.']
  }
]

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

export const DashboardPage = () => {
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const pushToast = useToastStore((state) => state.push)
  const { data: workspaces } = useWorkspaces(Boolean(accessToken))
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!accessToken) {
        throw new Error('Not authenticated.')
      }
      let workspaceId = workspaces?.[0]?.id
      if (!workspaceId) {
        const created = await workspacesApi.create({ name: 'New Workspace' })
        workspaceId = created.id
      }
      const payload = new FormData()
      payload.append('workspace', workspaceId)
      payload.append('file', file)
      payload.append('title', file.name)
      const document = await documentsApi.create(workspaceId, payload)
      return { document, workspaceId }
    },
    onSuccess: ({ workspaceId }) => {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Upload started',
        description: 'Your PDF is being processed.',
        tone: 'success'
      })
      navigate(`/workspace/${workspaceId}`)
    },
    onError: () => {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Upload failed',
        description: 'Please try again.',
        tone: 'error'
      })
    }
  })

  const createWorkspaceMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) {
        throw new Error('Not authenticated.')
      }
      return workspacesApi.create({ name: 'New Workspace' })
    },
    onSuccess: (workspace) => {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Workspace ready',
        description: 'Start by uploading your first PDF.',
        tone: 'success'
      })
      navigate(`/workspace/${workspace.id}`)
    },
    onError: () => {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Workspace failed',
        description: 'Please try again.',
        tone: 'error'
      })
    }
  })

  const handleFileUpload = (file: File | null | undefined) => {
    if (!file) return
    uploadMutation.mutate(file)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files?.[0])
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFileUpload(event.dataTransfer.files?.[0])
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleOpenClick = () => {
    if (!accessToken) {
      navigate('/signup')
      return
    }
    fileInputRef.current?.click()
  }

  const handleCreateNew = () => {
    if (!accessToken) {
      navigate('/signup')
      return
    }
    createWorkspaceMutation.mutate()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Upload & collaborate</h1>
        <p className="text-sm text-surface-500">
          Drag in a PDF to start, or open a recent document with your team.
        </p>
      </div>
      <Card>
        <div
          className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
            isDragging
              ? 'border-accent-500 bg-accent-50/60 dark:border-accent-400 dark:bg-accent-600/10'
              : 'border-surface-200 bg-white/60 dark:border-surface-800 dark:bg-surface-900/40'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="text-lg font-semibold text-surface-900 dark:text-white">
            Drag & drop your PDF here
          </div>
          <p className="max-w-md text-sm text-surface-500">
            Keep files moving with fast uploads and automatic collaboration spaces.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={createWorkspaceMutation.isPending}
              className="rounded-full border border-surface-200 px-5 py-2 text-sm font-semibold text-surface-700 transition hover:border-accent-200 hover:text-accent-600 dark:border-surface-700 dark:text-surface-200"
            >
              {createWorkspaceMutation.isPending ? 'Creating...' : 'Create new'}
            </button>
            <button
              type="button"
              onClick={handleOpenClick}
              disabled={uploadMutation.isPending}
              className="rounded-full border border-accent-500 bg-accent-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Open'}
            </button>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent documents</h2>
            <p className="text-sm text-surface-500">Last modified files with collaborators.</p>
          </div>
          <Badge tone="accent">Live</Badge>
        </div>
        <div className="mt-4 space-y-3">
          {recentDocs.map((doc) => (
            <div
              key={doc.title}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-800"
            >
              <div>
                <div className="text-sm font-semibold">{doc.title}</div>
                <div className="text-xs text-surface-500">Last modified {doc.updated}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {doc.collaborators.map((collaborator) => (
                    <span
                      key={collaborator}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-surface-100 text-xs font-semibold text-surface-600 dark:border-surface-900 dark:bg-surface-800 dark:text-surface-200"
                      title={collaborator}
                    >
                      {getInitials(collaborator)}
                    </span>
                  ))}
                </div>
                <Badge>{doc.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
