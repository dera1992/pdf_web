import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { annotationsApi } from '../api/annotations'
import { useAnnotationStore } from '../store/annotationStore'
import { useViewerStore } from '../store/viewerStore'
import type { Annotation } from '../types/api'

type Point = { x: number; y: number }
type Rect = { x: number; y: number; width: number; height: number }

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const getPointerPosition = (event: React.PointerEvent<SVGSVGElement>, bounds: DOMRect) => ({
  x: event.clientX - bounds.left,
  y: event.clientY - bounds.top
})

const normalizeRect = (start: Point, end: Point): Rect => {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  return { x, y, width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y) }
}

type AnnotationCanvasProps = {
  documentId: string
}

export const AnnotationCanvas = ({ documentId }: AnnotationCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [draftRect, setDraftRect] = useState<Rect | null>(null)
  const [draftPath, setDraftPath] = useState<Point[]>([])
  const [isDrawing, setIsDrawing] = useState(false)

  const activeTool = useAnnotationStore((state) => state.activeTool)
  const annotations = useAnnotationStore((state) => state.annotations)
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation)
  const setAnnotations = useAnnotationStore((state) => state.setAnnotations)
  const updateAnnotation = useAnnotationStore((state) => state.updateAnnotation)
  const page = useViewerStore((state) => state.page)
  const zoom = useViewerStore((state) => state.zoom)

  useEffect(() => {
    if (!containerRef.current) return
    const element = containerRef.current
    const updateSize = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!documentId) return
    let cancelled = false
    const loadAnnotations = async () => {
      try {
        const data = await annotationsApi.list(documentId)
        if (!cancelled) {
          setAnnotations(data)
        }
      } catch {
        if (!cancelled) {
          setAnnotations([])
        }
      }
    }
    loadAnnotations()
    return () => {
      cancelled = true
    }
  }, [documentId, setAnnotations])

  const toPage = (value: number) => value / zoom
  const fromPage = (value: number) => value * zoom

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool === 'select') return
    if (!svgRef.current) return
    const bounds = svgRef.current.getBoundingClientRect()
    const start = getPointerPosition(event, bounds)
    setDragStart(start)
    setIsDrawing(true)

    if (activeTool === 'draw') {
      setDraftPath([start])
    } else {
      setDraftRect({ x: start.x, y: start.y, width: 0, height: 0 })
    }
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing || !dragStart || !svgRef.current) return
    const bounds = svgRef.current.getBoundingClientRect()
    const current = getPointerPosition(event, bounds)

    if (activeTool === 'draw') {
      setDraftPath((prev) => [...prev, current])
      return
    }

    setDraftRect(normalizeRect(dragStart, current))
  }

  const createAnnotation = useCallback(
    async (payload: Annotation) => {
      addAnnotation(payload)
      try {
        const saved = await annotationsApi.create(documentId, payload)
        updateAnnotation(payload.id, { ...saved })
      } catch {
        // Keep optimistic annotation if backend fails.
      }
    },
    [addAnnotation, documentId, updateAnnotation]
  )

  const handlePointerUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    if (activeTool === 'draw' && draftPath.length > 1) {
      const annotation: Annotation = {
        id: createId(),
        documentId,
        page,
        type: 'draw',
        points: draftPath.map((point) => ({ x: toPage(point.x), y: toPage(point.y) })),
        style: { color: '#2563eb', thickness: 2, opacity: 1 },
        createdAt: new Date().toISOString()
      }
      void createAnnotation(annotation)
    }

    if (draftRect && draftRect.width > 4 && draftRect.height > 4) {
      const rect = {
        x: toPage(draftRect.x),
        y: toPage(draftRect.y),
        width: toPage(draftRect.width),
        height: toPage(draftRect.height)
      }
      const style = {
        color:
          activeTool === 'highlight'
            ? '#facc15'
            : activeTool === 'underline' || activeTool === 'strike'
              ? '#0ea5e9'
              : '#f43f5e',
        opacity: activeTool === 'highlight' ? 0.35 : 1,
        thickness: 2
      }

      const annotation: Annotation = {
        id: createId(),
        documentId,
        page,
        type:
          activeTool === 'shape'
            ? 'shape'
            : activeTool === 'note'
              ? 'note'
              : activeTool === 'stamp'
                ? 'stamp'
                : activeTool === 'signature'
                  ? 'signature'
                  : activeTool === 'form'
                    ? 'form'
                    : activeTool === 'underline'
                      ? 'underline'
                      : activeTool === 'strike'
                        ? 'strike'
                        : 'highlight',
        rects: [rect],
        content: activeTool === 'note' ? 'Add a comment…' : undefined,
        style,
        createdAt: new Date().toISOString()
      }
      void createAnnotation(annotation)
    }

    setDraftRect(null)
    setDraftPath([])
    setDragStart(null)
  }

  const renderedAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.page === page),
    [annotations, page]
  )

  return (
    <div ref={containerRef} className="absolute inset-0">
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className="h-full w-full cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {renderedAnnotations.map((annotation) => {
          if (annotation.type === 'draw' && annotation.points) {
            const path = annotation.points
              .map((point, index) => `${index === 0 ? 'M' : 'L'} ${fromPage(point.x)} ${fromPage(point.y)}`)
              .join(' ')
            return (
              <path
                key={annotation.id}
                d={path}
                fill="none"
                stroke={annotation.style?.color ?? '#2563eb'}
                strokeWidth={annotation.style?.thickness ?? 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          }

          const rect = annotation.rects?.[0]
          if (!rect) return null

          const x = fromPage(rect.x)
          const y = fromPage(rect.y)
          const width = fromPage(rect.width)
          const height = fromPage(rect.height)

          if (annotation.type === 'underline') {
            return (
              <line
                key={annotation.id}
                x1={x}
                x2={x + width}
                y1={y + height}
                y2={y + height}
                stroke={annotation.style?.color ?? '#0ea5e9'}
                strokeWidth={annotation.style?.thickness ?? 2}
              />
            )
          }

          if (annotation.type === 'strike') {
            return (
              <line
                key={annotation.id}
                x1={x}
                x2={x + width}
                y1={y + height / 2}
                y2={y + height / 2}
                stroke={annotation.style?.color ?? '#0ea5e9'}
                strokeWidth={annotation.style?.thickness ?? 2}
              />
            )
          }

          if (annotation.type === 'note') {
            return (
              <g key={annotation.id}>
                <rect x={x} y={y} width={width} height={height} fill="#fff1f2" stroke="#f43f5e" rx={6} />
                <text x={x + 10} y={y + 24} fontSize={12} fill="#9f1239">
                  {annotation.content ?? 'Note'}
                </text>
              </g>
            )
          }

          if (annotation.type === 'stamp' || annotation.type === 'signature' || annotation.type === 'form') {
            return (
              <rect
                key={annotation.id}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="rgba(14,116,144,0.1)"
                stroke="#0e7490"
                strokeDasharray={annotation.type === 'signature' ? '6 4' : '0'}
                rx={4}
              />
            )
          }

          if (annotation.type === 'shape') {
            return (
              <rect
                key={annotation.id}
                x={x}
                y={y}
                width={width}
                height={height}
                fill="transparent"
                stroke={annotation.style?.color ?? '#f43f5e'}
                strokeWidth={annotation.style?.thickness ?? 2}
              />
            )
          }

          return (
            <rect
              key={annotation.id}
              x={x}
              y={y}
              width={width}
              height={height}
              fill={annotation.style?.color ?? '#facc15'}
              opacity={annotation.style?.opacity ?? 0.35}
              stroke="transparent"
            />
          )
        })}

        {draftRect && activeTool !== 'draw' && (
          <rect
            x={draftRect.x}
            y={draftRect.y}
            width={draftRect.width}
            height={draftRect.height}
            fill={activeTool === 'highlight' ? '#facc15' : 'transparent'}
            opacity={activeTool === 'highlight' ? 0.3 : 1}
            stroke="#94a3b8"
            strokeDasharray="4 3"
          />
        )}

        {draftPath.length > 1 && activeTool === 'draw' && (
          <path
            d={draftPath.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  )
}
