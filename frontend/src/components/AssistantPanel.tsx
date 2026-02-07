import { useEffect, useMemo, useRef, useState } from 'react'
import { requestAiInsight } from '../api/ai'
import { useAiStore } from '../store/aiStore'
import { useToastStore } from '../store/toastStore'
import { useUiStore } from '../store/uiStore'
import { Button } from './ui/Button'
import { Input } from './ui/Input'

export const AssistantPanel = () => {
  const {
    messages,
    addMessage,
    isLoading,
    error,
    canUseAi,
    usesExternalAi,
    selectedText,
    selectedPageRange,
    draftPrompt,
    lastRequest,
    focusInputToken,
    setDraftPrompt,
    setLastRequest,
    setLoading,
    setError,
    triggerInputFocus,
    clearSelection,
    setSelectedPageRange
  } = useAiStore()
  const setRightPanelTab = useUiStore((state) => state.setRightPanelTab)
  const pushToast = useToastStore((state) => state.push)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(draftPrompt)

  useEffect(() => {
    setInputValue(draftPrompt)
  }, [draftPrompt])

  useEffect(() => {
    if (focusInputToken > 0) {
      inputRef.current?.focus()
    }
  }, [focusInputToken])

  const contextLabel = useMemo(() => {
    if (selectedText) {
      return `Selected text · ${selectedText.slice(0, 80)}${selectedText.length > 80 ? '…' : ''}`
    }
    if (selectedPageRange) {
      return `Pages ${selectedPageRange}`
    }
    return ''
  }, [selectedPageRange, selectedText])

  const handleAction = async (intent: 'question' | 'summary' | 'explain', prompt?: string) => {
    const messageContent = prompt ?? inputValue
    if (!messageContent.trim()) return
    if (!canUseAi) {
      setError('AI access is disabled for this document.')
      return
    }
    setLastRequest({ intent, prompt: messageContent })
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
      intent
    })
    setLoading(true)
    setError(null)
    try {
      const result = await requestAiInsight({
        intent,
        prompt: messageContent,
        selectedText: selectedText || undefined,
        pageRange: selectedPageRange || undefined
      })
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.response,
        intent,
        citations: result.citations,
        supportingText: result.supportingText
      })
      clearSelection()
      setInputValue('')
      setDraftPrompt('')
    } catch (requestError) {
      setError('We had trouble reaching the AI service. Try again or use in-document search.')
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'AI request failed. Please retry or search within the document.',
        intent
      })
      console.error(requestError)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = () => {
    if (!lastRequest) return
    handleAction(lastRequest.intent, lastRequest.prompt)
  }

  const handleSearchFallback = () => {
    const query = lastRequest?.prompt ?? inputValue
    if (!query.trim()) return
    window.find(query)
    pushToast({
      id: crypto.randomUUID(),
      title: 'Searching document',
      description: `Finding “${query.slice(0, 80)}${query.length > 80 ? '…' : ''}” in the viewer.`
    })
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    pushToast({ id: crypto.randomUUID(), title: 'Copied to clipboard', tone: 'success' })
  }

  const handleInsert = () => {
    pushToast({
      id: crypto.randomUUID(),
      title: 'Inserted into comment',
      description: 'Draft comment created from the AI response.'
    })
  }

  const handleExport = () => {
    pushToast({
      id: crypto.randomUUID(),
      title: 'Exported to notes',
      description: 'Saved the response to your notes workspace.',
      tone: 'success'
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {usesExternalAi && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            External AI services may be used. Responses respect document permissions.
          </div>
        )}
        {!canUseAi && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            AI access is disabled for this document. Contact an administrator to request access.
          </div>
        )}
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-300 p-4 text-sm text-surface-500">
            Ask CloudPDF AI to summarize, explain, or locate critical clauses.
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div
                className={`rounded-lg p-3 text-sm ${
                  message.role === 'assistant'
                    ? 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-100'
                    : 'bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-100'
                }`}
              >
                {message.content}
              </div>
              {message.role === 'assistant' && message.citations && message.citations.length > 0 && (
                <div className="rounded-lg border border-surface-200 bg-white p-3 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200">
                  <div className="mb-2 font-semibold">Citations</div>
                  <ul className="space-y-1">
                    {message.citations.map((citation) => (
                      <li key={citation.id}>
                        Page {citation.page} — {citation.label}
                      </li>
                    ))}
                  </ul>
                  {message.supportingText && message.supportingText.length > 0 && (
                    <div className="mt-3 rounded-md border border-dashed border-surface-200 p-2 text-[11px] text-surface-500 dark:border-surface-700">
                      <div className="mb-2 font-semibold text-surface-700 dark:text-surface-200">Supporting text</div>
                      <ul className="space-y-1">
                        {message.supportingText.map((text) => (
                          <li key={text}>“{text}”</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => handleCopy(message.content)}>
                      Copy
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleInsert}>
                      Insert into comment
                    </Button>
                    <Button size="sm" variant="secondary" onClick={handleExport}>
                      Export to notes
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="rounded-lg border border-surface-200 bg-white p-3 text-xs text-surface-500 dark:border-surface-700 dark:bg-surface-900">
            Analyzing document context…
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            <div className="mb-2 font-semibold">AI request failed</div>
            <div>{error}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={handleRetry} disabled={!lastRequest}>
                Retry
              </Button>
              <Button size="sm" variant="secondary" onClick={handleSearchFallback}>
                Search in document
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {contextLabel && (
          <div className="text-xs text-surface-500">
            Using context: <span className="font-semibold text-surface-700 dark:text-surface-200">{contextLabel}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500">
          <span className="font-semibold text-surface-600 dark:text-surface-200">Page range</span>
          <Input
            className="h-8 w-28 text-xs"
            placeholder="e.g. 2-4"
            value={selectedPageRange}
            onChange={(event) => setSelectedPageRange(event.target.value)}
          />
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Clear context
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleAction('summary', selectedText ? 'Summarize the selected text.' : 'Summarize the current section.')}
            disabled={isLoading || !canUseAi}
          >
            Summarize
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              handleAction('explain', selectedText ? 'Explain this in plain language.' : 'Explain the key concept here.')
            }
            disabled={isLoading || !canUseAi}
          >
            Explain this
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setRightPanelTab('assistant')
              triggerInputFocus()
              setDraftPrompt('What does the selected text mean?')
            }}
            disabled={isLoading || !canUseAi}
          >
            Ask about selection
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Ask a question"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                handleAction('question')
              }
            }}
            disabled={!canUseAi}
          />
          <Button disabled={isLoading || !canUseAi} onClick={() => handleAction('question')}>
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
