import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export const ExportsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Export Center</h1>
      <p className="text-sm text-surface-500">Manage export jobs and outputs.</p>
    </div>
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Q3 Financial Report</div>
          <div className="text-xs text-surface-500">Export to Word in progress</div>
        </div>
        <Button variant="secondary">View job</Button>
      </div>
    </Card>
  </div>
)
