import apiClient from './client'

export const securityApi = {
  async updatePasswords(documentId: string, payload: { ownerPassword?: string; userPassword?: string }) {
    const { data } = await apiClient.post(`/documents/${documentId}/security/passwords`, payload)
    return data
  },
  async updatePermissions(documentId: string, payload: { canPrint: boolean; canEdit: boolean }) {
    const { data } = await apiClient.post(`/documents/${documentId}/security/permissions`, payload)
    return data
  },
  async watermark(documentId: string, payload: { text?: string; imageUrl?: string; opacity: number; angle: number }) {
    const { data } = await apiClient.post(`/documents/${documentId}/security/watermark`, payload)
    return data
  }
}
