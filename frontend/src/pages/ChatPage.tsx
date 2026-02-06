import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const ChatPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-semibold">Team Chat</h1>
      <p className="text-sm text-surface-500">Discuss updates with your collaborators.</p>
    </div>
    <Card className="flex h-[60vh] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto">
        <div className="rounded-lg bg-surface-100 p-3 text-sm dark:bg-surface-800">Marco: Reviewing the export queue now.</div>
        <div className="rounded-lg bg-accent-50 p-3 text-sm text-accent-700 dark:bg-accent-900/40 dark:text-accent-100">You: Please prioritize the Q3 report.</div>
      </div>
      <div className="mt-4 flex gap-2">
        <Input placeholder="Send a message" />
        <Button>Send</Button>
      </div>
    </Card>
  </div>
)
