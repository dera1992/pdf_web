import apiClient from './client'
import type { AuditEvent } from '../types/api'

export const auditApi = {
  async list() {
    const { data } = await apiClient.get<AuditEvent[]>('/audit/events')
    return data
  }
}
