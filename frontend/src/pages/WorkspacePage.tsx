import { useParams } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'

export const WorkspacePage = () => {
  const { id } = useParams()
  const { data, isLoading } = useDocuments(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspace {id}</h1>
          <p className="text-sm text-surface-500">Manage documents and teams.</p>
        </div>
        <Button>Upload PDF</Button>
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
