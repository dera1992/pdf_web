import apiClient from './client'

export const aiApi = {
  async chat(documentId: string, message: string) {
    const { data } = await apiClient.post(`/documents/${documentId}/ai/chat`, { message })
    return data
  },
  async summary(documentId: string) {
    const { data } = await apiClient.get(`/documents/${documentId}/ai/summary`)
    return data
  }
}
