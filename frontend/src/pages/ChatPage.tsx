import { useState } from 'react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

type ChatMessage = {
  id: string
  author: 'You' | 'Marco'
  content: string
  tone?: 'assistant' | 'user'
}

const initialMessages: ChatMessage[] = [
  {
    id: 'seed-1',
    author: 'Marco',
    content: 'Reviewing the export queue now.',
    tone: 'assistant'
  },
  {
    id: 'seed-2',
    author: 'You',
    content: 'Please prioritize the Q3 report.',
    tone: 'user'
  }
]

export const ChatPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [draft, setDraft] = useState('')

  const handleSend = () => {
    const trimmed = draft.trim()
    if (!trimmed) return

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        author: 'You',
        content: trimmed,
        tone: 'user'
      }
    ])
    setDraft('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team Chat</h1>
        <p className="text-sm text-surface-500">Discuss updates with your collaborators.</p>
      </div>
      <Card className="flex h-[60vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.tone === 'user'
                  ? 'rounded-lg bg-accent-50 p-3 text-sm text-accent-700 dark:bg-accent-900/40 dark:text-accent-100'
                  : 'rounded-lg bg-surface-100 p-3 text-sm dark:bg-surface-800'
              }
            >
              {message.author}: {message.content}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Send a message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleSend()
              }
            }}
          />
          <Button onClick={handleSend} disabled={!draft.trim()}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  )
}
