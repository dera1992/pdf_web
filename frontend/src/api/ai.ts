import apiClient from './client'

export type AiRequestPayload = {
  documentId: string
  prompt: string
  intent: 'question' | 'summary' | 'explain'
  selectedText?: string
  pageRange?: string
}

export type AiResult = {
  response: string
  citations: { id: string; page: number; label: string }[]
  supportingText: string[]
}

type ChatSession = {
  id: number
  document: number
  user: number | null
  created_at: string
}

type ChatMessageCitation = {
  id: string
  page: number
  label: string
}

type ChatMessageResponse = {
  id: number
  session: number
  role: string
  content: string
  created_at: string
  citations?: ChatMessageCitation[]
  supporting_text?: string[]
}

const sessionCache = new Map<string, number>()

const formatPromptWithContext = ({ intent, prompt, selectedText, pageRange }: Omit<AiRequestPayload, 'documentId'>) => {
  const contextParts: string[] = []
  if (selectedText) {
    contextParts.push(`Selected text: ${selectedText}`)
  }
  if (pageRange) {
    contextParts.push(`Page range: ${pageRange}`)
  }

  return [
    `Intent: ${intent}`,
    `User prompt: ${prompt}`,
    contextParts.length > 0 ? `Context:\n${contextParts.join('\n')}` : null
  ]
    .filter(Boolean)
    .join('\n\n')
}

const getOrCreateChatSessionId = async (documentId: string): Promise<number> => {
  const cachedSessionId = sessionCache.get(documentId)
  if (cachedSessionId) return cachedSessionId

  const { data: session } = await apiClient.post<ChatSession>(`/documents/${documentId}/chat/`)

  sessionCache.set(documentId, session.id)
  return session.id
}

export const requestAiInsight = async (payload: AiRequestPayload): Promise<AiResult> => {
  const { documentId, ...rest } = payload
  const sessionId = await getOrCreateChatSessionId(documentId)
  const content = formatPromptWithContext(rest)

  const { data } = await apiClient.post<ChatMessageResponse>(`/chat/${sessionId}/message/`, {
    content
  })

  return {
    response: data.content,
    citations: data.citations ?? [],
    supportingText: data.supporting_text ?? []
  }
}
