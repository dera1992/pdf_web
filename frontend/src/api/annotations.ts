import apiClient from './client'
import type { Annotation } from '../types/api'

export const annotationsApi = {
  async list(documentId: string) {
    const { data } = await apiClient.get<Annotation[]>(`/documents/${documentId}/annotations`)
    return data
  },
  async create(documentId: string, payload: Partial<Annotation>) {
    const { data } = await apiClient.post<Annotation>(`/documents/${documentId}/annotations`, payload)
    return data
  },
  async update(documentId: string, annotationId: string, payload: Partial<Annotation>) {
    const { data } = await apiClient.put<Annotation>(`/documents/${documentId}/annotations/${annotationId}`, payload)
    return data
  },
  async remove(documentId: string, annotationId: string) {
    const { data } = await apiClient.delete(`/documents/${documentId}/annotations/${annotationId}`)
    return data
  }
}
