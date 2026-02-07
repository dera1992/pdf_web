import { useQuery } from '@tanstack/react-query'
import { workspacesApi } from '../api/workspaces'

export const useWorkspaces = (enabled: boolean) => {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => workspacesApi.list(),
    enabled
  })
}
