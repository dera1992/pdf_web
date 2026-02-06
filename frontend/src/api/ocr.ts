import apiClient from './client'

export const ocrApi = {
  async start(documentId: string, language: string) {
    const { data } = await apiClient.post(`/documents/${documentId}/ocr`, { language })
    return data
  },
  async status(documentId: string) {
    const { data } = await apiClient.get(`/documents/${documentId}/ocr/status`)
    return data
  }
}
