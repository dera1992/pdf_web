import { useParams } from 'react-router-dom'
import { PdfCanvas } from '../components/PdfCanvas'
import { AnnotationCanvas } from '../components/AnnotationCanvas'

export const DocumentVersionPage = () => {
  const { documentId, versionId } = useParams()

  return (
    <div className="relative flex h-full w-full justify-center">
      <div className="absolute left-4 top-4 rounded-full bg-accent-600 px-3 py-1 text-xs font-semibold text-white">
        Viewing version {versionId}
      </div>
      <div className="relative">
        <PdfCanvas url="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf" />
        <AnnotationCanvas documentId={documentId ?? 'local'} />
      </div>
    </div>
  )
}
