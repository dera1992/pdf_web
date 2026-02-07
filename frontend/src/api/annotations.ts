import apiClient from './client'
import type { Annotation } from '../types/api'

type AnnotationPayload = {
  rects?: { x: number; y: number; width: number; height: number }[]
  points?: { x: number; y: number }[]
  style?: { color?: string; opacity?: number; thickness?: number; fontSize?: number }
  content?: string
  author?: { id: string; name: string }
  revision?: number
}

type ApiAnnotation = {
  id: number | string
  document: number | string
  version: number | string
  page_number: number
  type: string
  payload: AnnotationPayload
  created_by?: string | number | null
  created_at?: string
  updated_at?: string
  is_deleted?: boolean
}

const mapApiTypeToFrontend = (type: string): Annotation['type'] => {
  switch (type) {
    case 'highlight':
      return 'highlight'
    case 'underline':
      return 'underline'
    case 'strikethrough':
      return 'strike'
    case 'ink':
      return 'draw'
    case 'note':
      return 'note'
    case 'shape':
      return 'shape'
    case 'stamp':
      return 'stamp'
    case 'signature':
      return 'signature'
    case 'form':
      return 'form'
    default:
      return 'highlight'
  }
}

const mapFrontendTypeToApi = (type: Annotation['type']) => {
  switch (type) {
    case 'strike':
      return 'strikethrough'
    case 'draw':
      return 'ink'
    default:
      return type
  }
}

const mapApiAnnotation = (annotation: ApiAnnotation): Annotation => ({
  id: annotation.id.toString(),
  documentId: annotation.document?.toString() ?? '',
  page: annotation.page_number,
  type: mapApiTypeToFrontend(annotation.type),
  rects: annotation.payload?.rects,
  points: annotation.payload?.points,
  style: annotation.payload?.style,
  content: annotation.payload?.content,
  author: annotation.payload?.author,
  createdAt: annotation.created_at ?? new Date().toISOString(),
  updatedAt: annotation.updated_at,
  revision: annotation.payload?.revision
})

const mapFrontendAnnotation = (annotation: Annotation) => ({
  page_number: annotation.page,
  type: mapFrontendTypeToApi(annotation.type),
  payload: {
    rects: annotation.rects,
    points: annotation.points,
    style: annotation.style,
    content: annotation.content,
    author: annotation.author,
    revision: annotation.revision
  }
})

export const annotationsApi = {
  async list(versionId: string) {
    const { data } = await apiClient.get<ApiAnnotation[]>(`/versions/${versionId}/annotations/`)
    return data.map(mapApiAnnotation)
  },
  async create(versionId: string, payload: Annotation) {
    const { data } = await apiClient.post<ApiAnnotation>(
      `/versions/${versionId}/annotations/`,
      mapFrontendAnnotation(payload)
    )
    return mapApiAnnotation(data)
  },
  async update(annotationId: string, payload: Partial<Annotation>) {
    const requestPayload = {
      ...(payload.page !== undefined ? { page_number: payload.page } : {}),
      ...(payload.type ? { type: mapFrontendTypeToApi(payload.type) } : {}),
      ...(payload.rects ||
      payload.points ||
      payload.style ||
      payload.content ||
      payload.author ||
      payload.revision !== undefined
        ? {
            payload: {
              rects: payload.rects,
              points: payload.points,
              style: payload.style,
              content: payload.content,
              author: payload.author,
              revision: payload.revision
            }
          }
        : {})
    }
    const { data } = await apiClient.patch<ApiAnnotation>(`/annotations/${annotationId}/`, requestPayload)
    return mapApiAnnotation(data)
  },
  async remove(annotationId: string) {
    const { data } = await apiClient.delete(`/annotations/${annotationId}/`)
    return data
  }
}
