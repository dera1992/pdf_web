import apiClient from './client'
import type { Document } from '../types/api'

export const documentsApi = {
  async list(workspaceId: string) {
    const { data } = await apiClient.get<Document[]>(`/workspaces/${workspaceId}/documents/`)
    return data
  },
  async get(documentId: string) {
    const { data } = await apiClient.get<Document>(`/documents/${documentId}/`)
    return data
  },
  async create(workspaceId: string, payload: FormData) {
    const { data } = await apiClient.post<Document>(`/workspaces/${workspaceId}/documents/`, payload)
    return data
  },
  async remove(documentId: string) {
    const { data } = await apiClient.delete(`/documents/${documentId}/`)
    return data
  }
}
