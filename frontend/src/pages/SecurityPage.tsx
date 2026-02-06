import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const SecurityPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Security Center</h1>
      <p className="text-sm text-surface-500">Protect sensitive PDFs with policies.</p>
    </div>
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Password Protection</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Input placeholder="Owner password" type="password" />
        <Input placeholder="User password" type="password" />
      </div>
      <Button>Apply passwords</Button>
    </Card>
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Watermark Builder</h2>
      <Input placeholder="Watermark text" />
      <Button variant="secondary">Preview watermark</Button>
    </Card>
  </div>
)
