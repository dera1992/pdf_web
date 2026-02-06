import { useAiStore } from '../store/aiStore'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

export const AssistantPanel = () => {
  const { messages, addMessage } = useAiStore()

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-300 p-4 text-sm text-surface-500">
            Ask CloudPDF AI to summarize, explain, or locate critical clauses.
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg p-3 text-sm ${
                message.role === 'assistant'
                  ? 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-100'
                  : 'bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-100'
              }`}
            >
              {message.content}
            </div>
          ))
        )}
        <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
          <div className="mb-2 font-semibold text-surface-700 dark:text-surface-200">Suggested summary</div>
          The report highlights YoY growth of 18% and a projected Q4 upswing.
        </div>
        <div className="rounded-lg border border-surface-200 p-3 text-xs text-surface-500 dark:border-surface-700">
          <div className="mb-2 font-semibold text-surface-700 dark:text-surface-200">Source references</div>
          <div className="space-y-1">
            <div>Page 3 — Revenue table</div>
            <div>Page 7 — Forecast commentary</div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Input placeholder="Ask a question" />
        <Button
          onClick={() =>
            addMessage({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: 'Sure! I can help analyze this document.'
            })
          }
        >
          Send
        </Button>
      </div>
    </div>
  )
}
