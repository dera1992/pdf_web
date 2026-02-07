import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PdfViewer } from '../components/PdfViewer'
import { AnnotationCanvas } from '../components/AnnotationCanvas'
import { CollaborationOverlay } from '../components/CollaborationOverlay'
import { useCollaborationSocket } from '../websocket/useCollaborationSocket'
import { useDocumentStore } from '../store/documentStore'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useCollaborationStore } from '../store/collaborationStore'
import { useViewerStore } from '../store/viewerStore'
import { documentsApi } from '../api/documents'

export const DocumentPage = () => {
  const { documentId } = useParams()
  const setActiveDocument = useDocumentStore((state) => state.setActiveDocument)
  const collaborators = useCollaborationStore((state) => state.collaborators)
  const setCollaborators = useCollaborationStore((state) => state.setCollaborators)
  const darkMode = useViewerStore((state) => state.darkMode)
  const [versionId, setVersionId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string>('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf')

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
      } catch {
        if (cancelled) return
        setActiveDocument({
          id: documentId,
          title: 'Q3 Financial Report',
          updatedAt: new Date().toISOString(),
          pageCount: 42,
          status: 'ready'
        })
      }
    }
    loadDocument()
    return () => {
      cancelled = true
    }
  }, [documentId, setActiveDocument])

  useEffect(() => {
    if (!versionId) return
    let cancelled = false
    const loadPdf = async () => {
      try {
        const data = await documentsApi.getVersionDownload(versionId)
        if (!cancelled && data.url) {
          setPdfUrl(data.url)
        }
      } catch {
        if (!cancelled) {
          setPdfUrl('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf')
        }
      }
    }
    loadPdf()
    return () => {
      cancelled = true
    }
  }, [versionId])

  useEffect(() => {
    if (collaborators.length === 0) {
      setCollaborators([
        { id: 'u1', name: 'Aria', color: '#f43f5e' },
        { id: 'u2', name: 'Noah', color: '#22c55e' }
      ])
    }
  }, [collaborators.length, setCollaborators])

  return (
    <div className="relative flex h-full w-full justify-center">
      <div className={`relative h-full w-full ${darkMode ? 'mix-blend-screen brightness-90' : ''}`}>
        <PdfViewer url={pdfUrl} />
        <AnnotationCanvas documentId={documentId ?? 'local'} versionId={versionId} />
        <CollaborationOverlay />
      </div>
    </div>
  )
}
