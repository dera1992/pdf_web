import { useQuery } from '@tanstack/react-query'
import { documentsApi } from '../api/documents'

export const useDocuments = (workspaceId?: string) => {
  return useQuery({
    queryKey: ['documents', workspaceId],
    queryFn: () => documentsApi.list(workspaceId ?? ''),
    enabled: Boolean(workspaceId)
  })
}
