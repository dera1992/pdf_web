import { useQuery } from '@tanstack/react-query'
import { auditApi } from '../api/audit'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

export const AuditLogPage = () => {
  const { data } = useQuery({ queryKey: ['audit'], queryFn: auditApi.list })

  return (
    <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Audit Log</h1>
      <p className="text-sm text-surface-500">Track key activity across workspaces.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      <Input placeholder="Filter by user" />
      <Input placeholder="Filter by action" />
      <Input placeholder="Search timeline" />
    </div>
      <Card>
        <div className="space-y-3">
          {(data ?? []).map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-lg border border-surface-200 px-4 py-3 dark:border-surface-800">
              <div>
                <div className="text-sm font-semibold">{event.action}</div>
                <div className="text-xs text-surface-500">{event.actor}</div>
              </div>
              <div className="text-xs text-surface-400">{new Date(event.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {data?.length === 0 && <div className="text-sm text-surface-500">No audit events yet.</div>}
        </div>
      </Card>
    </div>
  )
}
