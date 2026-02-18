import apiClient from './client'

type CommentResponse = {
  id: number
  document: number
  annotation: number | null
  parent: number | null
  body: string
  created_by: number | null
  created_at: string
  updated_at: string
  is_deleted: boolean
  revision_number: number
}

export const commentsApi = {
  async createDocumentComment(documentId: string, body: string, parent?: number | null) {
    const payload: { body: string; parent?: number } = { body }
    if (typeof parent === 'number') {
      payload.parent = parent
    }
    const { data } = await apiClient.post<CommentResponse>(`/documents/${documentId}/comments/`, payload)
    return data
  }
}
