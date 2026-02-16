import apiClient from './client'

export type AsyncJobResponse = {
  id: number
  status: string
  progress: number
  result_url: string | null
  preview_url?: string | null
}

export const pdfToolsApi = {
  editText: (versionId: string, payload: { layout_json: Record<string, unknown>; text_content: string }) =>
    apiClient.post(`/versions/${versionId}/edit-text/`, payload),
  numberPages: (versionId: string, payload: Record<string, unknown>) =>
    apiClient.post<AsyncJobResponse>(`/versions/${versionId}/number-pages/`, payload),
  crop: (versionId: string, payload: Record<string, unknown>) =>
    apiClient.post<AsyncJobResponse>(`/versions/${versionId}/crop/`, payload),
  redact: (versionId: string, payload: Record<string, unknown>) =>
    apiClient.post(`/versions/${versionId}/redact/`, payload),
  watermark: (versionId: string, payload: Record<string, unknown>) =>
    apiClient.post<AsyncJobResponse>(`/versions/${versionId}/watermark/`, payload),
  fillForm: (versionId: string, payload: Record<string, unknown>) =>
    apiClient.post(`/versions/${versionId}/fill-form/`, payload),
  share: (versionId: string, payload: { expires_in_hours?: number; password?: string }) =>
    apiClient.post(`/versions/${versionId}/share/`, payload),
  convertToWord: (versionId: string) => apiClient.post<AsyncJobResponse>(`/versions/${versionId}/convert/word/`),
  convertToExcel: (versionId: string) => apiClient.post<AsyncJobResponse>(`/versions/${versionId}/convert/excel/`),
  convertToPpt: (versionId: string) => apiClient.post<AsyncJobResponse>(`/versions/${versionId}/convert/ppt/`),
  convertToJpg: (versionId: string) => apiClient.post<AsyncJobResponse>(`/versions/${versionId}/convert/jpg/`),
  wordToPdf: (payload: FormData) => apiClient.post<AsyncJobResponse>('/convert/word-to-pdf/', payload),
  excelToPdf: (payload: FormData) => apiClient.post<AsyncJobResponse>('/convert/excel-to-pdf/', payload),
  pptToPdf: (payload: FormData) => apiClient.post<AsyncJobResponse>('/convert/ppt-to-pdf/', payload),
  jpgToPdf: (payload: FormData) => apiClient.post<AsyncJobResponse>('/convert/jpg-to-pdf/', payload)
}
