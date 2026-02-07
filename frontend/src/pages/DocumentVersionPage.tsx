import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PdfViewer } from '../components/PdfViewer'
import { AnnotationCanvas } from '../components/AnnotationCanvas'
import { documentsApi } from '../api/documents'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useAiStore } from '../store/aiStore'

export const DocumentVersionPage = () => {
  const { documentId, versionId } = useParams()
  const [pdfUrl, setPdfUrl] = useState<string>('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf')
  const setPermissions = useAiStore((state) => state.setPermissions)

  useKeyboardShortcuts()

  useEffect(() => {
    setPermissions({ canUseAi: true, usesExternalAi: true })
  }, [setPermissions])

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

  return (
    <div className="relative flex h-full w-full justify-center">
      <div className="absolute left-4 top-4 rounded-full bg-accent-600 px-3 py-1 text-xs font-semibold text-white">
        Viewing version {versionId}
      </div>
      <div className="relative h-full w-full">
        <PdfViewer url={pdfUrl} />
        <AnnotationCanvas documentId={documentId ?? 'local'} versionId={versionId ?? null} />
      </div>
    </div>
  )
}
