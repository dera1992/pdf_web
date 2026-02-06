import { useEffect, useRef } from 'react'
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist'
import { useViewerStore } from '../store/viewerStore'

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`

type PdfCanvasProps = {
  url: string
}

export const PdfCanvas = ({ url }: PdfCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { page, zoom } = useViewerStore()

  useEffect(() => {
    let cancelled = false

    const renderPage = async () => {
      const loadingTask = getDocument(url)
      const pdf = await loadingTask.promise
      const pdfPage = await pdf.getPage(page)
      const viewport = pdfPage.getViewport({ scale: zoom })
      const canvas = canvasRef.current
      if (!canvas || cancelled) return
      const context = canvas.getContext('2d')
      if (!context) return
      canvas.height = viewport.height
      canvas.width = viewport.width
      await pdfPage.render({ canvasContext: context, viewport }).promise
    }

    renderPage().catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [page, url, zoom])

  return <canvas ref={canvasRef} className="max-w-full rounded-lg shadow-card" />
}
