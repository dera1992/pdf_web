import { FormEvent, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../api/client'
import { Card } from '../components/ui/Card'
import { getToolById } from '../data/pdfTools'

export const ToolDetailPage = () => {
  const { toolId } = useParams<{ toolId: string }>()
  const tool = useMemo(() => getToolById(toolId ?? ''), [toolId])
  const [versionId, setVersionId] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [payloadText, setPayloadText] = useState(tool?.payloadHint ?? '{}')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string>('')
  const [error, setError] = useState<string>('')

  if (!tool) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10 lg:px-6">
        <h1 className="text-2xl font-semibold">Tool not found</h1>
        <Link to="/tools" className="mt-3 inline-block text-accent-600">
          Back to tools
        </Link>
      </div>
    )
  }

  const endpoint = tool.endpoint.replace('{versionId}', versionId || ':versionId')

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResponse('')
    try {
      const url = tool.endpoint.replace('{versionId}', versionId)
      let result
      if (tool.method === 'GET') {
        result = await apiClient.get(url)
      } else if (tool.needsFileUpload) {
        const form = new FormData()
        if (workspaceId) form.append('workspace', workspaceId)
        if (file) form.append('file', file)
        result = await apiClient.post(url, form)
      } else {
        const body = payloadText.trim() ? JSON.parse(payloadText) : {}
        result = await apiClient.post(url, body)
      }
      setResponse(JSON.stringify(result.data, null, 2))
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : 'Request failed.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 lg:px-6">
      <div className="mb-6">
        <Link to="/tools" className="text-sm font-semibold text-accent-600">
          ← Back to all tools
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-surface-900 dark:text-white">{tool.name}</h1>
        <p className="mt-2 text-surface-600 dark:text-surface-300">{tool.description}</p>
      </div>

      <Card className="p-6">
        <div className="mb-4 rounded-lg bg-surface-100 p-3 text-xs dark:bg-surface-800">
          <div>
            <strong>Endpoint:</strong> {endpoint}
          </div>
          <div>
            <strong>Method:</strong> {tool.method}
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          {tool.needsVersionId && (
            <div>
              <label className="mb-1 block text-sm font-medium">Version ID</label>
              <input
                required
                value={versionId}
                onChange={(event) => setVersionId(event.target.value)}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900"
                placeholder="e.g. 12"
              />
            </div>
          )}

          {tool.needsWorkspaceId && (
            <div>
              <label className="mb-1 block text-sm font-medium">Workspace ID</label>
              <input
                required
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900"
                placeholder="e.g. 3"
              />
            </div>
          )}

          {tool.needsFileUpload ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Upload file</label>
              <input
                type="file"
                required
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-900"
              />
            </div>
          ) : tool.method === 'POST' ? (
            <div>
              <label className="mb-1 block text-sm font-medium">JSON payload</label>
              <textarea
                value={payloadText}
                onChange={(event) => setPayloadText(event.target.value)}
                className="h-40 w-full rounded-lg border border-surface-300 px-3 py-2 font-mono text-xs dark:border-surface-700 dark:bg-surface-900"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-60"
          >
            {loading ? 'Running…' : 'Run tool'}
          </button>
        </form>
      </Card>

      {(response || error) && (
        <Card className="mt-6 p-6">
          <h2 className="mb-2 text-lg font-semibold">Response</h2>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <pre className="overflow-x-auto rounded-lg bg-surface-950 p-3 text-xs text-surface-100">{response}</pre>
          )}
        </Card>
      )}
    </div>
  )
}
