import { type ChangeEvent, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDocuments } from '../hooks/useDocuments'
import { documentsApi } from '../api/documents'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { useToastStore } from '../store/toastStore'

export const WorkspacePage = () => {
  const { id } = useParams()
  const { data, isLoading } = useDocuments(id)
  const queryClient = useQueryClient()
  const pushToast = useToastStore((state) => state.push)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!id) throw new Error('Missing workspace.')
      const payload = new FormData()
      payload.append('workspace', id)
      payload.append('file', file)
      payload.append('title', file.name)
      return documentsApi.create(id, payload)
    },
    onSuccess: () => {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Upload started',
        description: 'Your PDF is being processed.',
        tone: 'success'
      })
      void queryClient.invalidateQueries({ queryKey: ['documents', id] })
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    uploadMutation.mutate(file)
    event.target.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspace {id}</h1>
          <p className="text-sm text-surface-500">Manage documents and teams.</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending || !id}
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload PDF'}
          </Button>
        </div>
      </div>
      <Card>
        <div className="text-sm font-semibold">Documents</div>
        {isLoading ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {(data ?? []).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-800">
                <div>
                  <div className="text-sm font-semibold">{doc.title}</div>
                  <div className="text-xs text-surface-500">{doc.pageCount} pages</div>
                </div>
                <Badge tone={doc.status === 'ready' ? 'accent' : 'neutral'}>{doc.status}</Badge>
              </div>
            ))}
            {data?.length === 0 && <div className="text-sm text-surface-500">No documents yet.</div>}
          </div>
        )}
      </Card>
    </div>
  )
}
