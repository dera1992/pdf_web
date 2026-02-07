import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PdfCanvas } from '../components/PdfCanvas'
import { AnnotationCanvas } from '../components/AnnotationCanvas'
import { CollaborationOverlay } from '../components/CollaborationOverlay'
import { useCollaborationSocket } from '../websocket/useCollaborationSocket'
import { useDocumentStore } from '../store/documentStore'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useCollaborationStore } from '../store/collaborationStore'
import { useViewerStore } from '../store/viewerStore'

export const DocumentPage = () => {
  const { documentId } = useParams()
  const setActiveDocument = useDocumentStore((state) => state.setActiveDocument)
  const collaborators = useCollaborationStore((state) => state.collaborators)
  const setCollaborators = useCollaborationStore((state) => state.setCollaborators)
  const darkMode = useViewerStore((state) => state.darkMode)

  useCollaborationSocket(documentId ?? null)
  useKeyboardShortcuts()

  useEffect(() => {
    if (documentId) {
      setActiveDocument({
        id: documentId,
        title: 'Q3 Financial Report',
        updatedAt: new Date().toISOString(),
        pageCount: 42,
        status: 'ready'
      })
    }
  }, [documentId, setActiveDocument])

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
      <div className={`relative ${darkMode ? 'mix-blend-screen brightness-90' : ''}`}>
        <PdfCanvas url="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf" />
        <AnnotationCanvas documentId={documentId ?? 'local'} />
        <CollaborationOverlay />
      </div>
    </div>
  )
}
