import apiClient from './client'
import type { Workspace } from '../types/api'

export const workspacesApi = {
  async list() {
    const { data } = await apiClient.get<Workspace[]>('/workspaces')
    return data
  },
  async create(payload: { name: string }) {
    const { data } = await apiClient.post<Workspace>('/workspaces', payload)
    return data
  }
}
