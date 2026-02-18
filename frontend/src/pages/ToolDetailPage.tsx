import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'
import { Card } from '../components/ui/Card'
import { getToolById } from '../data/pdfTools'

type ToolRunResponse = {
  result_url?: string | null
  preview_url?: string | null
  [key: string]: unknown
}

const isPreviewable = (name: string | undefined) => {
  if (!name) return false
  const lower = name.toLowerCase()
  return lower.endsWith('.pdf') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')
}

export const ToolDetailPage = () => {
  const { toolId } = useParams<{ toolId: string }>()
  const tool = useMemo(() => getToolById(toolId ?? ''), [toolId])
  const [searchParams] = useSearchParams()
  const [versionId, setVersionId] = useState(searchParams.get('versionId') ?? '')
  const [workspaceId, setWorkspaceId] = useState(searchParams.get('workspaceId') ?? '')
  const [payloadText, setPayloadText] = useState(tool?.payloadHint ?? '{}')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string>('')
  const [responseData, setResponseData] = useState<ToolRunResponse | null>(null)
  const [error, setError] = useState<string>('')
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file || !isPreviewable(file.name)) {
      setUploadedPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setUploadedPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

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

  const setDroppedFile = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      setFile(droppedFile)
    }
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResponse('')
    setResponseData(null)
    try {
      const url = tool.endpoint.replace('{versionId}', versionId)
      let result
      if (tool.method === 'GET') {
        result = await apiClient.get(url)
      } else if (tool.needsFileUpload) {
        const form = new FormData()
        if (workspaceId) form.append('workspace', workspaceId)
        if (file) form.append('file', file)
        const body = payloadText.trim() ? JSON.parse(payloadText) : {}
        Object.entries(body).forEach(([key, value]) => {
          if (value === undefined || value === null || key === 'file' || key === 'workspace') return
          form.append(key, String(value))
        })
        result = await apiClient.post(url, form)
      } else {
        const body = payloadText.trim() ? JSON.parse(payloadText) : {}
        result = await apiClient.post(url, body)
      }
      setResponseData(result.data as ToolRunResponse)
      setResponse(JSON.stringify(result.data, null, 2))
    } catch (submitError: unknown) {
      const message = submitError instanceof Error ? submitError.message : 'Request failed.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const previewUrl = responseData?.preview_url
  const downloadUrl = responseData?.result_url

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-6">
      <div className="mb-6">
        <Link to="/tools" className="text-sm font-semibold text-accent-600">
          ← Back to all tools
        </Link>
        <h1 className="mt-2 text-3xl font-semibold text-surface-900 dark:text-white">{tool.name}</h1>
        <p className="mt-2 text-surface-600 dark:text-surface-300">{tool.description}</p>
      </div>

      <Card className="p-6">
        {!tool.needsFileUpload && (
          <div className="mb-4 rounded-lg bg-surface-100 p-3 text-xs dark:bg-surface-800">
            <div>
              <strong>Endpoint:</strong> {endpoint}
            </div>
            <div>
              <strong>Method:</strong> {tool.method}
            </div>
          </div>
        )}

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
                placeholder="optional for guest convert-to-pdf"
              />
            </div>
          )}

          {tool.needsFileUpload ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Upload file</label>
                <label
                  htmlFor="tool-upload"
                  onDrop={setDroppedFile}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
                    isDragging
                      ? 'border-accent-500 bg-accent-50 dark:bg-surface-800'
                      : 'border-surface-300 bg-surface-50 dark:border-surface-700 dark:bg-surface-900'
                  }`}
                >
                  <span className="text-sm font-semibold">Drag and drop your file here</span>
                  <span className="mt-1 text-xs text-surface-500">or click to browse</span>
                  {file && <span className="mt-3 text-xs text-accent-700 dark:text-accent-300">Selected: {file.name}</span>}
                </label>
                <input
                  id="tool-upload"
                  type="file"
                  required
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>

              {tool.payloadHint && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Optional JSON payload</label>
                  <textarea
                    value={payloadText}
                    onChange={(event) => setPayloadText(event.target.value)}
                    className="h-24 w-full rounded-lg border border-surface-300 px-3 py-2 font-mono text-xs dark:border-surface-700 dark:bg-surface-900"
                  />
                </div>
              )}
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

      {(uploadedPreviewUrl || previewUrl) && (
        <div className="mt-6 grid grid-cols-12 gap-4">
          <Card className={`col-span-12 p-4 ${previewUrl ? 'lg:col-span-7' : ''}`}>
            <h2 className="mb-2 text-lg font-semibold">Uploaded document</h2>
            {uploadedPreviewUrl ? (
              <iframe
                title="Uploaded document preview"
                src={uploadedPreviewUrl}
                className="h-[640px] w-full rounded-lg border border-surface-200 dark:border-surface-700"
              />
            ) : (
              <p className="text-sm text-surface-500">Preview not available for this upload type.</p>
            )}
          </Card>
          {previewUrl && (
            <Card className="col-span-12 p-4 lg:col-span-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Converted preview</h2>
                {downloadUrl && (
                  <a
                    href={downloadUrl as string}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-accent-600 hover:text-accent-700"
                  >
                    Download
                  </a>
                )}
              </div>
              <iframe
                title="Conversion preview"
                src={previewUrl as string}
                className="h-[640px] w-full rounded-lg border border-surface-200 dark:border-surface-700"
              />
            </Card>
          )}
        </div>
      )}

      {!previewUrl && downloadUrl && (
        <Card className="mt-6 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Converted file</h2>
            <a
              href={downloadUrl as string}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-accent-600 hover:text-accent-700"
            >
              Download converted file
            </a>
          </div>
          <p className="mt-2 text-sm text-surface-500">
            This format cannot be previewed in-browser. Use download to open it in a compatible application.
          </p>
        </Card>
      )}

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
