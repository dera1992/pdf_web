import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PdfCanvas } from '../components/PdfCanvas'
import { AnnotationCanvas } from '../components/AnnotationCanvas'
import { documentsApi } from '../api/documents'

export const DocumentVersionPage = () => {
  const { documentId, versionId } = useParams()
  const [pdfUrl, setPdfUrl] = useState<string>('https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf')

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
      <div className="relative">
        <PdfCanvas url={pdfUrl} />
        <AnnotationCanvas documentId={documentId ?? 'local'} versionId={versionId ?? null} />
      </div>
    </div>
  )
}
