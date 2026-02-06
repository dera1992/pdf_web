import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const SettingsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-surface-500">Manage profile and preferences.</p>
    </div>
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Profile</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Input placeholder="Full name" />
        <Input placeholder="Email address" />
      </div>
      <Button>Save changes</Button>
    </Card>
  </div>
)
