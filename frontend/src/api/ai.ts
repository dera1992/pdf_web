export type AiRequestPayload = {
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

const buildCitations = (intent: AiRequestPayload['intent']): AiResult['citations'] => {
  if (intent === 'summary') {
    return [
      { id: crypto.randomUUID(), page: 2, label: 'Executive summary overview' },
      { id: crypto.randomUUID(), page: 4, label: 'Performance highlights' }
    ]
  }
  if (intent === 'explain') {
    return [
      { id: crypto.randomUUID(), page: 5, label: 'Key definition' },
      { id: crypto.randomUUID(), page: 6, label: 'Supporting calculation' }
    ]
  }
  return [
    { id: crypto.randomUUID(), page: 3, label: 'Relevant clause' },
    { id: crypto.randomUUID(), page: 7, label: 'Cross-reference' }
  ]
}

export const requestAiInsight = async (payload: AiRequestPayload): Promise<AiResult> => {
  const { intent, prompt, selectedText, pageRange } = payload
  const contextNote = selectedText
    ? `Based on the selected text (${selectedText.slice(0, 140)}${selectedText.length > 140 ? '…' : ''})`
    : pageRange
      ? `Based on pages ${pageRange}`
      : 'Based on the current document context'

  const response =
    intent === 'summary'
      ? `${contextNote}, here is a concise summary: • Key themes include revenue growth and margin improvements. • Risks are centered on FX exposure and supply constraints. • The outlook points to steady Q4 demand with cautious hiring.`
      : intent === 'explain'
        ? `${contextNote}, here's a simplified explanation: The highlighted concept describes how revenue recognition is deferred until delivery. In plain terms, the company waits to book income until obligations are met.`
        : `${contextNote}, the answer is: The clause indicates the renewal window is 30 days before term end, and automatic renewal applies unless written notice is provided.`

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        response,
        citations: buildCitations(intent),
        supportingText: [
          '“Renewal notices must be submitted no fewer than thirty (30) days before termination.”',
          '“Revenue is recognized when performance obligations are satisfied.”'
        ]
      })
    }, 700)
  })
}
