import { create } from 'zustand'
import type { Workspace } from '../types/api'

type WorkspaceState = {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  setWorkspaces: (workspaces: Workspace[]) => void
  setActiveWorkspace: (workspaceId: string) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId })
}))
