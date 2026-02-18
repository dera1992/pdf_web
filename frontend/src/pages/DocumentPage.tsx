import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PdfViewer } from '../components/PdfViewer'
import { AnnotationCanvas } from '../components/AnnotationCanvas'
import { CollaborationOverlay } from '../components/CollaborationOverlay'
import { useCollaborationSocket } from '../websocket/useCollaborationSocket'
import { useDocumentStore } from '../store/documentStore'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useCollaborationStore } from '../store/collaborationStore'
import { useAiStore } from '../store/aiStore'
import { useViewerStore } from '../store/viewerStore'
import { useToastStore } from '../store/toastStore'
import { documentsApi } from '../api/documents'

export const DocumentPage = () => {
  const { documentId } = useParams()
  const setActiveDocument = useDocumentStore((state) => state.setActiveDocument)
  const collaborators = useCollaborationStore((state) => state.collaborators)
  const setCollaborators = useCollaborationStore((state) => state.setCollaborators)
  const darkMode = useViewerStore((state) => state.darkMode)
  const setPermissions = useAiStore((state) => state.setPermissions)
  const pushToast = useToastStore((state) => state.push)
  const [versionId, setVersionId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  useCollaborationSocket(documentId ?? null)
  useKeyboardShortcuts()

  useEffect(() => {
    if (!documentId) return
    let cancelled = false
    const loadDocument = async () => {
      try {
        const data = await documentsApi.get(documentId)
        if (cancelled) return
        setActiveDocument(data)
        setVersionId(data.current_version?.id?.toString() ?? null)
        const allowedAiRoles = new Set(['viewer', 'editor', 'admin', 'owner'])
        const hasAiRole = data.workspace_role ? allowedAiRoles.has(data.workspace_role) : false
        const documentReadyForAi = data.status !== 'processing' && data.status !== 'error'

        setPermissions({
          canUseAi: hasAiRole && documentReadyForAi,
          usesExternalAi: true
        })
      } catch {
        if (cancelled) return
        setActiveDocument({
          id: documentId,
          title: 'Unable to load document metadata',
          updatedAt: new Date().toISOString(),
          pageCount: 0,
          status: 'error'
        })
        setPermissions({ canUseAi: false, usesExternalAi: true })
      }
    }
    loadDocument()
    return () => {
      cancelled = true
    }
  }, [documentId, setActiveDocument, setPermissions])

  useEffect(() => {
    if (!versionId) {
      setPdfUrl(null)
      setPdfError('No document version is available yet.')
      return
    }

    let cancelled = false
    let objectUrlToCleanup: string | null = null

    const loadPdf = async () => {
      setPdfLoading(true)
      setPdfError(null)

      try {
        const blobUrl = await documentsApi.getVersionBlobUrl(versionId)
        if (cancelled) {
          URL.revokeObjectURL(blobUrl)
          return
        }
        objectUrlToCleanup = blobUrl
        setPdfUrl(blobUrl)
        return
      } catch {
        // fallback to direct URL from API
      }

      try {
        const data = await documentsApi.getVersionDownload(versionId)
        if (cancelled) return
        if (!data.url) {
          throw new Error('Missing download URL.')
        }
        setPdfUrl(data.url)
      } catch {
        if (cancelled) return
        setPdfUrl(null)
        setPdfError('We could not load this PDF. Please try reloading the document.')
        pushToast({
          id: crypto.randomUUID(),
          title: 'Document preview failed',
          description: 'Unable to load the selected PDF file.',
          tone: 'error'
        })
      } finally {
        if (!cancelled) {
          setPdfLoading(false)
        }
      }
    }

    void loadPdf()

    return () => {
      cancelled = true
      if (objectUrlToCleanup) {
        URL.revokeObjectURL(objectUrlToCleanup)
      }
    }
  }, [pushToast, versionId])

  useEffect(() => {
    if (collaborators.length === 0) {
      setCollaborators([
        { id: 'u1', name: 'Aria', color: '#f43f5e' },
        { id: 'u2', name: 'Noah', color: '#22c55e' }
      ])
    }
  }, [collaborators.length, setCollaborators])

  if (pdfLoading && !pdfUrl) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-surface-500">
        Loading document preview…
      </div>
    )
  }

  if (pdfError && !pdfUrl) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center text-sm text-rose-600 dark:text-rose-300">
        {pdfError}
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full justify-center">
      <div className={`relative h-full w-full ${darkMode ? 'mix-blend-screen brightness-90' : ''}`}>
        {pdfUrl && <PdfViewer url={pdfUrl} />}
        <AnnotationCanvas documentId={documentId ?? 'local'} versionId={versionId} />
        <CollaborationOverlay />
      </div>
    </div>
  )
}
