import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist'
import { useDebounce } from '../hooks/useDebounce'
import { useViewerStore } from '../store/viewerStore'
import 'pdfjs-dist/web/pdf_viewer.css'

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`

type PdfViewerProps = {
  url: string
  className?: string
}

type RenderCacheEntry = {
  key: string
  bitmap: ImageBitmap
}

const createRenderCache = (limit: number) => {
  const entries = new Map<string, RenderCacheEntry>()
  return {
    get: (key: string) => entries.get(key),
    set: (key: string, entry: RenderCacheEntry) => {
      entries.set(key, entry)
      if (entries.size > limit) {
        const firstKey = entries.keys().next().value
        if (firstKey) entries.delete(firstKey)
      }
    }
  }
}

const renderTextLayer = async (page: any, viewport: any, textLayer: HTMLDivElement) => {
  const textContent = await page.getTextContent()
  const { TextLayer } = await import('pdfjs-dist/web/pdf_viewer')
  const layer = new TextLayer({
    textContentSource: textContent,
    container: textLayer,
    viewport
  })
  textLayer.setAttribute('data-text-layer', 'true')
  await layer.render()
}

const renderAnnotationLayer = async (
  page: any,
  viewport: any,
  annotationLayer: HTMLDivElement,
  pdfDocument: any
) => {
  const annotations = await page.getAnnotations()
  const { AnnotationLayer, SimpleLinkService } = await import('pdfjs-dist/web/pdf_viewer')
  AnnotationLayer.render({
    annotations,
    div: annotationLayer,
    page,
    viewport,
    linkService: new SimpleLinkService(),
    renderForms: true,
    pdfDocument
  })
}

const useFrameMonitor = () => {
  useEffect(() => {
    let active = true
    let last = performance.now()
    const loop = (now: number) => {
      if (!active) return
      const delta = now - last
      if (delta > 50) {
        console.info(`[pdf] Frame drop detected: ${Math.round(delta)}ms`)
      }
      last = now
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    return () => {
      active = false
    }
  }, [])
}

const PdfPage = ({
  pageNumber,
  pdf,
  zoom,
  cache,
  onRender
}: {
  pageNumber: number
  pdf: any
  zoom: number
  cache: ReturnType<typeof createRenderCache>
  onRender: (page: number, time: number) => void
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const textLayerRef = useRef<HTMLDivElement | null>(null)
  const annotationLayerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    const renderPage = async () => {
      if (!canvasRef.current || !textLayerRef.current || !annotationLayerRef.current) return
      const start = performance.now()
      const page = await pdf.getPage(pageNumber)
      const outputScale = window.devicePixelRatio || 1
      const viewport = page.getViewport({ scale: zoom })
      const renderViewport = page.getViewport({ scale: zoom * outputScale })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      if (!context || cancelled) return

      canvas.height = renderViewport.height
      canvas.width = renderViewport.width
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`

      if (containerRef.current) {
        containerRef.current.style.width = `${viewport.width}px`
        containerRef.current.style.height = `${viewport.height}px`
      }

      textLayerRef.current.style.width = `${viewport.width}px`
      textLayerRef.current.style.height = `${viewport.height}px`
      annotationLayerRef.current.style.width = `${viewport.width}px`
      annotationLayerRef.current.style.height = `${viewport.height}px`

      const cacheKey = `${pageNumber}-${zoom}-${outputScale}`
      const cached = cache.get(cacheKey)
      if (cached) {
        context.drawImage(cached.bitmap, 0, 0, canvas.width, canvas.height)
      } else {
        const previewScale = Math.max(0.25, zoom * 0.6)
        const previewViewport = page.getViewport({ scale: previewScale * outputScale })
        const previewCanvas = document.createElement('canvas')
        const previewContext = previewCanvas.getContext('2d')
        if (previewContext) {
          previewCanvas.width = previewViewport.width
          previewCanvas.height = previewViewport.height
          await page.render({ canvasContext: previewContext, viewport: previewViewport }).promise
          context.drawImage(previewCanvas, 0, 0, canvas.width, canvas.height)
        }
        await page.render({ canvasContext: context, viewport: renderViewport }).promise

        const bitmap = await createImageBitmap(canvas)
        cache.set(cacheKey, { key: cacheKey, bitmap })
      }

      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = ''
        await renderTextLayer(page, viewport, textLayerRef.current)
      }
      if (annotationLayerRef.current) {
        annotationLayerRef.current.innerHTML = ''
        await renderAnnotationLayer(page, viewport, annotationLayerRef.current, pdf)
      }

      const elapsed = performance.now() - start
      onRender(pageNumber, elapsed)
    }

    renderPage().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [cache, onRender, pageNumber, pdf, zoom])

  return (
    <div ref={containerRef} className="relative mx-auto">
      <canvas ref={canvasRef} className="block rounded-lg shadow-card" />
      <div ref={textLayerRef} className="textLayer absolute inset-0" />
      <div ref={annotationLayerRef} className="annotationLayer absolute inset-0" />
    </div>
  )
}

export const PdfViewer = ({ url, className }: PdfViewerProps) => {
  const parentRef = useRef<HTMLDivElement | null>(null)
  const [pdf, setPdf] = useState<any>(null)
  const [pageSizes, setPageSizes] = useState<Map<number, { width: number; height: number }>>(new Map())
  const { page, setPage, pageCount, setPageCount, zoom } = useViewerStore()
  const debouncedZoom = useDebounce(zoom, 180)
  const cacheRef = useRef(createRenderCache(6))
  const scrollRaf = useRef<number | null>(null)

  useFrameMonitor()

  useEffect(() => {
    let cancelled = false
    const loadPdf = async () => {
      const loadingTask = getDocument(url)
      const document = await loadingTask.promise
      if (cancelled) return
      setPdf(document)
      setPageCount(document.numPages)
    }
    loadPdf().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [setPageCount, url])

  useEffect(() => {
    if (!pdf) return
    let cancelled = false
    const loadSizes = async () => {
      const next = new Map<number, { width: number; height: number }>()
      const sizePromises = Array.from({ length: pdf.numPages }).map(async (_, index) => {
        const pageNumber = index + 1
        const pdfPage = await pdf.getPage(pageNumber)
        const viewport = pdfPage.getViewport({ scale: 1 })
        next.set(pageNumber, { width: viewport.width, height: viewport.height })
      })
      await Promise.all(sizePromises)
      if (!cancelled) {
        setPageSizes(next)
      }
    }
    loadSizes().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [pdf])

  const rowVirtualizer = useVirtualizer({
    count: pageCount,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const size = pageSizes.get(index + 1)
      const height = size?.height ?? 1000
      return height * debouncedZoom + 32
    },
    overscan: 2
  })

  const visiblePages = rowVirtualizer.getVirtualItems().map((item) => item.index + 1)

  useEffect(() => {
    if (!pdf) return
    const preload = async (pageNumber: number) => {
      if (pageNumber < 1 || pageNumber > pdf.numPages) return
      await pdf.getPage(pageNumber)
    }
    const targets = new Set<number>()
    visiblePages.forEach((pageNumber) => {
      targets.add(pageNumber - 1)
      targets.add(pageNumber + 1)
    })
    void Promise.all(Array.from(targets).map((pageNumber) => preload(pageNumber)))
  }, [pdf, visiblePages])

  const handleScroll = useCallback(() => {
    if (scrollRaf.current !== null) return
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = null
      const first = rowVirtualizer.getVirtualItems()[0]
      if (first) {
        const pageNumber = first.index + 1
        if (pageNumber !== page) {
          setPage(pageNumber)
        }
      }
    })
  }, [page, rowVirtualizer, setPage])

  const onRender = useCallback((pageNumber: number, time: number) => {
    console.info(`[pdf] Rendered page ${pageNumber} in ${Math.round(time)}ms`)
    const memory = (performance as any).memory
    if (memory?.usedJSHeapSize) {
      console.info(`[pdf] Memory usage: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`)
    }
  }, [])

  const pageEntries = useMemo(() => rowVirtualizer.getVirtualItems(), [rowVirtualizer])

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className={`scrollbar-thin h-full overflow-auto px-6 py-6 ${className ?? ''}`}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {pageEntries.map((virtualRow) => {
          const pageNumber = virtualRow.index + 1
          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 right-0 flex justify-center"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
            >
              {pdf && (
                <PdfPage
                  pageNumber={pageNumber}
                  pdf={pdf}
                  zoom={debouncedZoom}
                  cache={cacheRef.current}
                  onRender={onRender}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
