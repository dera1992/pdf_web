import { type ChangeEvent, type DragEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { useWorkspaces } from '../../hooks/useWorkspaces'
import { workspacesApi } from '../../api/workspaces'
import { documentsApi } from '../../api/documents'

export const UploadZone = () => {
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
        const created = await workspacesApi.create({ name: 'My Workspace' })
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

  return (
    <section className="bg-surface-50 py-16 dark:bg-surface-800">
      <div className="mx-auto w-full max-w-5xl px-4 lg:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-semibold text-surface-900 dark:text-white">
            Drop a PDF and start collaborating
          </h2>
          <p className="mt-3 text-base text-surface-600 dark:text-surface-200">
            Create a workspace in seconds with fast uploads and automatic sharing.
          </p>
        </div>
        <div
          className={`mt-10 flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
            isDragging
              ? 'border-accent-500 bg-accent-50/80 dark:border-accent-400 dark:bg-accent-600/10'
              : 'border-surface-200 bg-white dark:border-surface-700 dark:bg-surface-900'
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
          <p className="max-w-md text-sm text-surface-500 dark:text-surface-300">
            We’ll handle versioning, permissions, and team updates automatically.
          </p>
          <button
            type="button"
            onClick={handleOpenClick}
            disabled={uploadMutation.isPending}
            className="rounded-full border border-accent-500 bg-accent-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Choose a PDF'}
          </button>
        </div>
      </div>
    </section>
  )
}
