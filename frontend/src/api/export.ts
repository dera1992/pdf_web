import apiClient from './client'

export const exportApi = {
  async start(documentId: string, format: 'word' | 'excel' | 'images') {
    const { data } = await apiClient.post(`/documents/${documentId}/export`, { format })
    return data
  },
  async status(jobId: string) {
    const { data } = await apiClient.get(`/exports/${jobId}`)
    return data
  }
}
