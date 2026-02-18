import { useCallback, useEffect, useRef, useState } from 'react'
import type { AxiosError } from 'axios'
import { annotationsApi, mapApiAnnotationToFrontend, type ApiAnnotation } from '../api/annotations'
import { pdfToolsApi } from '../api/pdfTools'
import {
  annotationsActions,
  selectAnnotationsByPage,
  useAnnotationsDispatch,
  useAnnotationsState
} from '../store/annotationsRedux'
import { useToastStore } from '../store/toastStore'
import { emitCollaborationEvent } from '../websocket/collaborationChannel'
import { useViewerStore } from '../store/viewerStore'
import type { Annotation } from '../types/api'

type Point = { x: number; y: number }
type Rect = { x: number; y: number; width: number; height: number }
type Handle = 'nw' | 'ne' | 'sw' | 'se'

type FormFieldDraft = {
  label: string
  value: string
  placeholder: string
  inputType: 'text' | 'number' | 'date'
  required: boolean
}

const DEFAULT_FORM_FIELD: FormFieldDraft = {
  label: 'Form field',
  value: '',
  placeholder: 'Enter value',
  inputType: 'text',
  required: false
}

const TEXT_TOOLS = new Set(['highlight', 'underline', 'strike'])
const DRAW_SAMPLING_MS = 16
const DRAW_MIN_POINT_DISTANCE = 2

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

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

const smoothPath = (points: Point[]) => {
  if (points.length < 3) return points
  const smoothed: Point[] = [points[0]]
  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = points[index - 1]
    const current = points[index]
    const next = points[index + 1]
    smoothed.push({
      x: (prev.x + current.x + next.x) / 3,
      y: (prev.y + current.y + next.y) / 3
    })
  }
  smoothed.push(points[points.length - 1])

  const simplified: Point[] = [smoothed[0]]
  for (let index = 1; index < smoothed.length; index += 1) {
    if (distance(smoothed[index], simplified[simplified.length - 1]) >= DRAW_MIN_POINT_DISTANCE) {
      simplified.push(smoothed[index])
    }
  }
  return simplified
}

const buildSvgPath = (points: Point[]) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

const drawPathOnCanvas = (
  context: CanvasRenderingContext2D,
  points: Point[],
  options: { color: string; thickness: number; opacity?: number }
) => {
  if (points.length < 2) return
  context.save()
  context.strokeStyle = options.color
  context.lineWidth = options.thickness
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.globalAlpha = options.opacity ?? 1
  context.beginPath()
  context.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y)
  }
  context.stroke()
  context.restore()
}


const parseFormContent = (content?: string): FormFieldDraft => {
  if (!content) return { ...DEFAULT_FORM_FIELD }
  try {
    const parsed = JSON.parse(content) as Partial<FormFieldDraft>
    return {
      label: typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label : DEFAULT_FORM_FIELD.label,
      value: typeof parsed.value === 'string' ? parsed.value : '',
      placeholder:
        typeof parsed.placeholder === 'string' && parsed.placeholder.trim()
          ? parsed.placeholder
          : DEFAULT_FORM_FIELD.placeholder,
      inputType:
        parsed.inputType === 'number' || parsed.inputType === 'date' || parsed.inputType === 'text'
          ? parsed.inputType
          : 'text',
      required: Boolean(parsed.required)
    }
  } catch {
    return { ...DEFAULT_FORM_FIELD, value: content }
  }
}

const serializeFormContent = (field: FormFieldDraft) =>
  JSON.stringify({
    label: field.label,
    value: field.value,
    placeholder: field.placeholder,
    inputType: field.inputType,
    required: field.required
  })

type AnnotationCanvasProps = {
  documentId: string
  versionId?: string | null
}

type ConflictResponse = {
  detail?: string
  annotation?: ApiAnnotation
  current_revision?: number
}

export const AnnotationCanvas = ({ documentId, versionId }: AnnotationCanvasProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [draftRect, setDraftRect] = useState<Rect | null>(null)
  const [draftPath, setDraftPath] = useState<Point[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [editingFormId, setEditingFormId] = useState<string | null>(null)
  const [formDraft, setFormDraft] = useState<FormFieldDraft>(DEFAULT_FORM_FIELD)
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null)
  const [resizeState, setResizeState] = useState<
    | {
        annotationId: string
        handle: Handle
        startPointer: Point
        originalRect: Rect
      }
    | null
  >(null)

  const pendingPointRef = useRef<Point | null>(null)
  const drawRafRef = useRef<number | null>(null)
  const lastDrawSampleRef = useRef(0)

  const annotationsState = useAnnotationsState()
  const annotationsDispatch = useAnnotationsDispatch()
  const pushToast = useToastStore((state) => state.push)
  const activeTool = annotationsState.activeTool
  const page = useViewerStore((state) => state.page)
  const zoom = useViewerStore((state) => state.zoom)
  const renderedAnnotations = selectAnnotationsByPage(annotationsState, page)

  const toPage = useCallback((value: number) => value / zoom, [zoom])
  const fromPage = useCallback((value: number) => value * zoom, [zoom])

  const broadcastAnnotationEvent = useCallback(
    (eventType: 'annotation.created' | 'annotation.updated' | 'annotation.deleted', event: Record<string, unknown>) => {
      emitCollaborationEvent(eventType, event)
    },
    []
  )

  const flushPendingPoint = useCallback(() => {
    if (!pendingPointRef.current) return
    const point = pendingPointRef.current
    pendingPointRef.current = null
    setDraftPath((prev) => {
      const last = prev[prev.length - 1]
      if (!last || distance(last, point) >= DRAW_MIN_POINT_DISTANCE) {
        return [...prev, point]
      }
      return prev
    })
  }, [])

  const stopDrawScheduler = useCallback(() => {
    if (drawRafRef.current !== null) {
      window.cancelAnimationFrame(drawRafRef.current)
      drawRafRef.current = null
    }
  }, [])

  useEffect(() => stopDrawScheduler, [stopDrawScheduler])

  const getAnnotationForUpdate = useCallback(
    (annotationId: string) => annotationsState.entities.byId[annotationId],
    [annotationsState.entities.byId]
  )

  const persistAnnotationUpdate = useCallback(
    async (annotationId: string, changes: Partial<Annotation>) => {
      const current = getAnnotationForUpdate(annotationId)
      if (!current || !versionId) return

      try {
        const saved = await annotationsApi.update(annotationId, {
          ...changes,
          revision: current.revision ?? 0
        })
        annotationsDispatch(annotationsActions.patch(annotationId, saved))
        broadcastAnnotationEvent('annotation.updated', { annotation: saved })
      } catch (error) {
        const axiosError = error as AxiosError<ConflictResponse>
        if (axiosError.response?.status === 409) {
          const latest = axiosError.response.data?.annotation
          if (latest) {
            const mapped = mapApiAnnotationToFrontend(latest)
            annotationsDispatch(annotationsActions.upsert(mapped))
          }
          pushToast({
            id: createId(),
            title: 'Annotation updated by another collaborator',
            description: 'Latest revision was applied. Please retry your change.',
            tone: 'error'
          })
          return
        }

        pushToast({
          id: createId(),
          title: 'Could not save annotation update',
          description: 'Your local edit is visible, but saving to the server failed.',
          tone: 'error'
        })
      }
    },
    [annotationsDispatch, broadcastAnnotationEvent, getAnnotationForUpdate, pushToast, versionId]
  )

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
    if (!versionId) return
    let cancelled = false
    const loadAnnotations = async () => {
      try {
        const data = await annotationsApi.list(versionId)
        if (!cancelled) {
          annotationsDispatch(annotationsActions.setAll(data))
        }
      } catch {
        if (!cancelled) {
          annotationsDispatch(annotationsActions.setAll([]))
        }
      }
    }
    loadAnnotations()
    return () => {
      cancelled = true
    }
  }, [annotationsDispatch, versionId])

  const createAnnotation = useCallback(
    async (payload: Annotation) => {
      annotationsDispatch(annotationsActions.upsert(payload))
      try {
        if (!versionId) return
        const saved = await annotationsApi.create(versionId, payload)
        annotationsDispatch(annotationsActions.reconcileOptimistic(payload.id, saved))
        broadcastAnnotationEvent('annotation.created', { annotation: saved })
      } catch {
        pushToast({
          id: createId(),
          title: 'Could not save new annotation',
          description: 'The annotation stays visible locally. Retry later to sync it.',
          tone: 'error'
        })
      }
    },
    [annotationsDispatch, broadcastAnnotationEvent, pushToast, versionId]
  )

  const upsertLocalAnnotation = (annotationId: string, changes: Partial<Annotation>) => {
    annotationsDispatch(annotationsActions.patch(annotationId, changes))
  }

  useEffect(() => {
    if (!containerRef.current || !TEXT_TOOLS.has(activeTool)) return

    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || selection.rangeCount === 0 || !containerRef.current) return
      const range = selection.getRangeAt(0)
      const text = selection.toString().trim()
      if (!text) return

      const containerBounds = containerRef.current.getBoundingClientRect()
      const rects = Array.from(range.getClientRects())
        .map((rect) => ({
          x: rect.left - containerBounds.left,
          y: rect.top - containerBounds.top,
          width: rect.width,
          height: rect.height
        }))
        .filter((rect) => rect.width > 1 && rect.height > 1)
        .map((rect) => ({
          x: toPage(rect.x),
          y: toPage(rect.y),
          width: toPage(rect.width),
          height: toPage(rect.height)
        }))

      if (rects.length === 0) return

      const style = {
        color: activeTool === 'highlight' ? '#facc15' : '#0ea5e9',
        opacity: activeTool === 'highlight' ? 0.35 : 1,
        thickness: 2
      }

      const annotation: Annotation = {
        id: createId(),
        documentId,
        page,
        type: activeTool as Annotation['type'],
        rects,
        content: text,
        style,
        createdAt: new Date().toISOString(),
        revision: 0
      }

      void createAnnotation(annotation)
      selection.removeAllRanges()
    }

    document.addEventListener('mouseup', handleSelection)
    return () => {
      document.removeEventListener('mouseup', handleSelection)
    }
  }, [activeTool, createAnnotation, documentId, page, toPage])

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool === 'select' || TEXT_TOOLS.has(activeTool)) return
    if (!svgRef.current) return

    const bounds = svgRef.current.getBoundingClientRect()
    const start = getPointerPosition(event, bounds)
    setDragStart(start)
    setIsDrawing(true)

    if (activeTool === 'draw' || activeTool === 'signature') {
      setDraftPath([start])
      pendingPointRef.current = null
      lastDrawSampleRef.current = performance.now()
      return
    }

    setDraftRect({ x: start.x, y: start.y, width: 0, height: 0 })
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return

    if (resizeState) {
      const bounds = svgRef.current.getBoundingClientRect()
      const current = getPointerPosition(event, bounds)
      const deltaX = current.x - resizeState.startPointer.x
      const deltaY = current.y - resizeState.startPointer.y

      const x1 = fromPage(resizeState.originalRect.x)
      const y1 = fromPage(resizeState.originalRect.y)
      const x2 = x1 + fromPage(resizeState.originalRect.width)
      const y2 = y1 + fromPage(resizeState.originalRect.height)

      let nextX1 = x1
      let nextY1 = y1
      let nextX2 = x2
      let nextY2 = y2

      if (resizeState.handle.includes('n')) nextY1 = y1 + deltaY
      if (resizeState.handle.includes('s')) nextY2 = y2 + deltaY
      if (resizeState.handle.includes('w')) nextX1 = x1 + deltaX
      if (resizeState.handle.includes('e')) nextX2 = x2 + deltaX

      const rect = normalizeRect({ x: nextX1, y: nextY1 }, { x: nextX2, y: nextY2 })
      upsertLocalAnnotation(resizeState.annotationId, {
        rects: [{ x: toPage(rect.x), y: toPage(rect.y), width: toPage(rect.width), height: toPage(rect.height) }]
      })
      return
    }

    if (!isDrawing || !dragStart) return
    const bounds = svgRef.current.getBoundingClientRect()
    const current = getPointerPosition(event, bounds)

    if (activeTool === 'draw' || activeTool === 'signature') {
      const now = performance.now()
      const elapsed = now - lastDrawSampleRef.current
      if (elapsed >= DRAW_SAMPLING_MS) {
        lastDrawSampleRef.current = now
        pendingPointRef.current = null
        setDraftPath((prev) => {
          const last = prev[prev.length - 1]
          if (!last || distance(last, current) >= DRAW_MIN_POINT_DISTANCE) {
            return [...prev, current]
          }
          return prev
        })
      } else {
        pendingPointRef.current = current
        if (drawRafRef.current === null) {
          drawRafRef.current = window.requestAnimationFrame(() => {
            drawRafRef.current = null
            flushPendingPoint()
          })
        }
      }
      return
    }

    setDraftRect(normalizeRect(dragStart, current))
  }

  const handlePointerUp = () => {
    flushPendingPoint()
    stopDrawScheduler()

    if (resizeState) {
      const updated = annotationsState.entities.byId[resizeState.annotationId]
      if (updated) {
        void persistAnnotationUpdate(resizeState.annotationId, { rects: updated.rects })
      }
      setResizeState(null)
      return
    }

    if (!isDrawing) return
    setIsDrawing(false)

    if ((activeTool === 'draw' || activeTool === 'signature') && draftPath.length > 1) {
      const processedPath = smoothPath(draftPath)
      const annotation: Annotation = {
        id: createId(),
        documentId,
        page,
        type: activeTool === 'signature' ? 'signature' : 'draw',
        points: processedPath.map((point) => ({ x: toPage(point.x), y: toPage(point.y) })),
        style:
          activeTool === 'signature'
            ? { color: '#0f172a', thickness: 2.5, opacity: 1 }
            : { color: '#2563eb', thickness: 2, opacity: 1 },
        createdAt: new Date().toISOString(),
        revision: 0
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
        color: activeTool === 'arrow' ? '#7c3aed' : '#f43f5e',
        opacity: 1,
        thickness: 2,
        shapeKind: activeTool === 'arrow' ? 'arrow' : 'rect'
      }

      const annotation: Annotation = {
        id: createId(),
        documentId,
        page,
        type:
          activeTool === 'shape' || activeTool === 'arrow'
            ? 'shape'
            : activeTool === 'note'
              ? 'note'
              : activeTool === 'stamp'
                ? 'stamp'
                : 'form',
        rects: [rect],
        content:
          activeTool === 'note'
            ? 'Add a comment…'
            : activeTool === 'form'
              ? serializeFormContent(DEFAULT_FORM_FIELD)
              : undefined,
        style,
        createdAt: new Date().toISOString(),
        revision: 0
      }
      void createAnnotation(annotation)
    }

    setDraftRect(null)
    setDraftPath([])
    setDragStart(null)
  }

  const saveNote = () => {
    if (!editingNoteId) return
    upsertLocalAnnotation(editingNoteId, { content: noteDraft })
    void persistAnnotationUpdate(editingNoteId, { content: noteDraft })
    setEditingNoteId(null)
    setNoteDraft('')
  }

  const saveFormField = () => {
    if (!editingFormId) return
    const normalized: FormFieldDraft = {
      ...formDraft,
      label: formDraft.label.trim() || DEFAULT_FORM_FIELD.label,
      placeholder: formDraft.placeholder.trim() || DEFAULT_FORM_FIELD.placeholder
    }
    const content = serializeFormContent(normalized)
    upsertLocalAnnotation(editingFormId, { content })
    void persistAnnotationUpdate(editingFormId, { content })
    setEditingFormId(null)
  }

  const applyFormFieldsToPdf = useCallback(async () => {
    if (!versionId) {
      pushToast({
        id: createId(),
        title: 'No active version',
        description: 'Load a document version before applying form values.',
        tone: 'error'
      })
      return
    }

    const fields = Object.values(annotationsState.entities.byId)
      .filter((annotation) => annotation.type === 'form' && annotation.rects?.[0])
      .map((annotation) => {
        const field = parseFormContent(annotation.content)
        const rect = annotation.rects?.[0]
        return {
          id: annotation.id,
          page: annotation.page,
          rect,
          ...field
        }
      })

    try {
      const response = await pdfToolsApi.fillForm(versionId, { fields })
      const newVersionId = response.data?.id?.toString?.()
      pushToast({
        id: createId(),
        title: 'Form fields applied',
        description: newVersionId
          ? `A filled PDF version (${newVersionId}) was generated.`
          : 'A filled PDF version was generated.',
        tone: 'success'
      })
    } catch {
      pushToast({
        id: createId(),
        title: 'Failed to apply form fields',
        description: 'Please retry after saving your fields.',
        tone: 'error'
      })
    }
  }, [annotationsState.entities.byId, pushToast, versionId])

  const deleteSelectedAnnotation = useCallback(async () => {
    if (!selectedAnnotationId) return
    const current = annotationsState.entities.byId[selectedAnnotationId]
    if (!current) return

    annotationsDispatch(annotationsActions.remove(selectedAnnotationId))

    try {
      if (versionId) {
        await annotationsApi.remove(selectedAnnotationId)
      }
      broadcastAnnotationEvent('annotation.deleted', {
        annotation_id: selectedAnnotationId,
        annotation: { id: selectedAnnotationId }
      })
      setSelectedAnnotationId(null)
    } catch {
      annotationsDispatch(annotationsActions.upsert(current))
      pushToast({
        id: createId(),
        title: 'Could not delete annotation',
        description: 'Delete failed and the annotation was restored.',
        tone: 'error'
      })
    }
  }, [annotationsDispatch, annotationsState.entities.byId, broadcastAnnotationEvent, pushToast, selectedAnnotationId, versionId])

  useEffect(() => {
    if (!selectedAnnotationId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      event.preventDefault()
      void deleteSelectedAnnotation()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelectedAnnotation, selectedAnnotationId])

  const selectedAnnotation = renderedAnnotations.find((annotation) => annotation.id === selectedAnnotationId)
  const selectedRect = selectedAnnotation?.rects?.[0]

  const canResize =
    selectedAnnotation &&
    selectedRect &&
    (selectedAnnotation.type === 'shape' || selectedAnnotation.type === 'stamp' || selectedAnnotation.type === 'form')

  const handles: { key: Handle; x: number; y: number }[] = canResize
    ? [
        { key: 'nw', x: fromPage(selectedRect.x), y: fromPage(selectedRect.y) },
        { key: 'ne', x: fromPage(selectedRect.x + selectedRect.width), y: fromPage(selectedRect.y) },
        { key: 'sw', x: fromPage(selectedRect.x), y: fromPage(selectedRect.y + selectedRect.height) },
        {
          key: 'se',
          x: fromPage(selectedRect.x + selectedRect.width),
          y: fromPage(selectedRect.y + selectedRect.height)
        }
      ]
    : []

  useEffect(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, Math.floor(size.width))
    const height = Math.max(1, Math.floor(size.height))
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const context = canvas.getContext('2d')
    if (!context) return

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.scale(dpr, dpr)

    renderedAnnotations.forEach((annotation) => {
      if ((annotation.type !== 'draw' && annotation.type !== 'signature') || !annotation.points?.length) {
        return
      }

      const canvasPoints = smoothPath(annotation.points).map((point) => ({
        x: fromPage(point.x),
        y: fromPage(point.y)
      }))

      drawPathOnCanvas(context, canvasPoints, {
        color: annotation.style?.color ?? (annotation.type === 'signature' ? '#0f172a' : '#2563eb'),
        thickness: annotation.style?.thickness ?? (annotation.type === 'signature' ? 2.5 : 2),
        opacity: annotation.style?.opacity ?? 1
      })
    })

    if (draftPath.length > 1 && (activeTool === 'draw' || activeTool === 'signature')) {
      drawPathOnCanvas(context, smoothPath(draftPath), {
        color: activeTool === 'signature' ? '#0f172a' : '#2563eb',
        thickness: activeTool === 'signature' ? 2.5 : 2,
        opacity: 1
      })
    }
  }, [activeTool, draftPath, fromPage, renderedAnnotations, size.height, size.width])

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={drawCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <svg
        ref={svgRef}
        width={size.width}
        height={size.height}
        className={`h-full w-full ${TEXT_TOOLS.has(activeTool) ? 'pointer-events-none' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#7c3aed" />
          </marker>
        </defs>
        {renderedAnnotations.map((annotation) => {
          if ((annotation.type === 'draw' || annotation.type === 'signature') && annotation.points) {
            const path = buildSvgPath(annotation.points.map((point) => ({ x: fromPage(point.x), y: fromPage(point.y) })))
            return (
              <path
                key={annotation.id}
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(10, (annotation.style?.thickness ?? 2) + 8)}
                strokeLinecap="round"
                strokeLinejoin="round"
                onPointerDown={() => setSelectedAnnotationId(annotation.id)}
              />
            )
          }

          const rects = annotation.rects ?? []
          if (rects.length === 0) return null

          if (annotation.type === 'underline' || annotation.type === 'strike') {
            return rects.map((rect, index) => {
              const x = fromPage(rect.x)
              const y = fromPage(rect.y)
              const width = fromPage(rect.width)
              const height = fromPage(rect.height)
              const yLine = annotation.type === 'underline' ? y + height : y + height / 2
              return (
                <line
                  key={`${annotation.id}-${index}`}
                  x1={x}
                  x2={x + width}
                  y1={yLine}
                  y2={yLine}
                  stroke={annotation.style?.color ?? '#0ea5e9'}
                  strokeWidth={annotation.style?.thickness ?? 2}
                />
              )
            })
          }

          if (annotation.type === 'highlight') {
            return rects.map((rect, index) => (
              <rect
                key={`${annotation.id}-${index}`}
                x={fromPage(rect.x)}
                y={fromPage(rect.y)}
                width={fromPage(rect.width)}
                height={fromPage(rect.height)}
                fill={annotation.style?.color ?? '#facc15'}
                opacity={annotation.style?.opacity ?? 0.35}
                onPointerDown={() => setSelectedAnnotationId(annotation.id)}
              />
            ))
          }

          const rect = rects[0]
          const x = fromPage(rect.x)
          const y = fromPage(rect.y)
          const width = fromPage(rect.width)
          const height = fromPage(rect.height)

          if (annotation.type === 'note') {
            return (
              <g
                key={annotation.id}
                onPointerDown={() => {
                  setSelectedAnnotationId(annotation.id)
                  setEditingNoteId(annotation.id)
                  setNoteDraft(annotation.content ?? '')
                }}
              >
                <rect x={x} y={y} width={width} height={height} fill="#fff1f2" stroke="#f43f5e" rx={6} />
                <text x={x + 10} y={y + 24} fontSize={12} fill="#9f1239">
                  {(annotation.content ?? 'Note').slice(0, 28)}
                </text>
              </g>
            )
          }

          if (annotation.type === 'form') {
            const field = parseFormContent(annotation.content)
            return (
              <g
                key={annotation.id}
                onPointerDown={() => {
                  setSelectedAnnotationId(annotation.id)
                  setEditingFormId(annotation.id)
                  setFormDraft(field)
                }}
              >
                <rect x={x} y={y} width={width} height={height} fill="#ffffff" stroke="#0ea5e9" rx={4} />
                <text x={x + 8} y={y + 14} fontSize={10} fill="#0f172a">
                  {field.label}
                </text>
                <text x={x + 8} y={y + 30} fontSize={11} fill={field.value ? '#0f172a' : '#64748b'}>
                  {(field.value || field.placeholder).slice(0, 36)}
                </text>
              </g>
            )
          }

          if (annotation.type === 'shape' && annotation.style?.shapeKind === 'arrow') {
            return (
              <line
                key={annotation.id}
                x1={x}
                y1={y + height}
                x2={x + width}
                y2={y}
                stroke={annotation.style?.color ?? '#7c3aed'}
                strokeWidth={annotation.style?.thickness ?? 2}
                markerEnd="url(#arrowhead)"
                onPointerDown={() => setSelectedAnnotationId(annotation.id)}
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
              fill={annotation.type === 'shape' ? 'transparent' : 'rgba(14,116,144,0.1)'}
              stroke={annotation.style?.color ?? '#0e7490'}
              strokeWidth={annotation.style?.thickness ?? 2}
              strokeDasharray={annotation.type === 'signature' ? '6 4' : '0'}
              rx={4}
              onPointerDown={() => setSelectedAnnotationId(annotation.id)}
            />
          )
        })}

        {draftRect && !TEXT_TOOLS.has(activeTool) && activeTool !== 'draw' && activeTool !== 'signature' && (
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

        {handles.map((handle) => (
          <circle
            key={handle.key}
            cx={handle.x}
            cy={handle.y}
            r={5}
            fill="#2563eb"
            stroke="#fff"
            strokeWidth={1}
            className="cursor-nwse-resize"
            onPointerDown={(event) => {
              event.stopPropagation()
              if (!svgRef.current || !selectedAnnotation || !selectedRect) return
              const bounds = svgRef.current.getBoundingClientRect()
              const pointer = { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
              setResizeState({
                annotationId: selectedAnnotation.id,
                handle: handle.key,
                startPointer: pointer,
                originalRect: selectedRect
              })
            }}
          />
        ))}
      </svg>

      {editingNoteId && (() => {
        const note = renderedAnnotations.find((annotation) => annotation.id === editingNoteId)
        const rect = note?.rects?.[0]
        if (!rect) return null
        const left = fromPage(rect.x + rect.width + 8)
        const top = fromPage(rect.y)
        return (
          <div
            className="absolute z-20 w-64 rounded-md border border-surface-300 bg-white p-3 shadow-lg"
            style={{ left, top }}
          >
            <textarea
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              className="h-24 w-full rounded border border-surface-300 p-2 text-xs"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                className="rounded border border-surface-300 px-2 py-1 text-xs"
                onClick={() => setEditingNoteId(null)}
              >
                Cancel
              </button>
              <button className="rounded bg-accent-600 px-2 py-1 text-xs text-white" onClick={saveNote}>
                Save
              </button>
            </div>
          </div>
        )

      })()}

      {editingFormId && (() => {
        const formAnnotation = renderedAnnotations.find((annotation) => annotation.id === editingFormId)
        const rect = formAnnotation?.rects?.[0]
        if (!rect) return null
        const left = fromPage(rect.x + rect.width + 8)
        const top = fromPage(rect.y)
        return (
          <div
            className="absolute z-20 w-72 rounded-md border border-surface-300 bg-white p-3 shadow-lg"
            style={{ left, top }}
          >
            <p className="mb-2 text-xs font-semibold text-surface-700">Form field editor</p>
            <div className="space-y-2 text-xs">
              <label className="block">
                <span className="mb-1 block text-surface-600">Field label</span>
                <input
                  value={formDraft.label}
                  onChange={(event) => setFormDraft((prev) => ({ ...prev, label: event.target.value }))}
                  className="w-full rounded border border-surface-300 px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-surface-600">Field type</span>
                <select
                  value={formDraft.inputType}
                  onChange={(event) =>
                    setFormDraft((prev) => ({ ...prev, inputType: event.target.value as FormFieldDraft['inputType'] }))
                  }
                  className="w-full rounded border border-surface-300 px-2 py-1"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-surface-600">Placeholder</span>
                <input
                  value={formDraft.placeholder}
                  onChange={(event) => setFormDraft((prev) => ({ ...prev, placeholder: event.target.value }))}
                  className="w-full rounded border border-surface-300 px-2 py-1"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-surface-600">Value</span>
                <input
                  type={formDraft.inputType}
                  value={formDraft.value}
                  onChange={(event) => setFormDraft((prev) => ({ ...prev, value: event.target.value }))}
                  className="w-full rounded border border-surface-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2 text-surface-700">
                <input
                  type="checkbox"
                  checked={formDraft.required}
                  onChange={(event) => setFormDraft((prev) => ({ ...prev, required: event.target.checked }))}
                />
                Required field
              </label>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button className="rounded border border-surface-300 px-2 py-1 text-xs" onClick={applyFormFieldsToPdf}>
                Apply to PDF
              </button>
              <button className="rounded border border-surface-300 px-2 py-1 text-xs" onClick={() => setEditingFormId(null)}>
                Cancel
              </button>
              <button className="rounded bg-accent-600 px-2 py-1 text-xs text-white" onClick={saveFormField}>
                Save field
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
