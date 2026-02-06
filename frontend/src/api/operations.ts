import apiClient from './client'

export const operationsApi = {
  async reorderPages(documentId: string, pageOrder: number[]) {
    const { data } = await apiClient.post(`/documents/${documentId}/pages/reorder`, { pageOrder })
    return data
  },
  async rotatePage(documentId: string, page: number, rotation: number) {
    const { data } = await apiClient.post(`/documents/${documentId}/pages/${page}/rotate`, { rotation })
    return data
  },
  async deletePage(documentId: string, page: number) {
    const { data } = await apiClient.delete(`/documents/${documentId}/pages/${page}`)
    return data
  },
  async merge(payload: { documentIds: string[] }) {
    const { data } = await apiClient.post('/documents/merge', payload)
    return data
  },
  async split(documentId: string, ranges: Array<{ from: number; to: number }>) {
    const { data } = await apiClient.post(`/documents/${documentId}/split`, { ranges })
    return data
  }
}
