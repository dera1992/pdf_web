import { create } from 'zustand'

export type Collaborator = {
  id: string
  name: string
  avatarUrl?: string
  color: string
}

type CollaborationState = {
  collaborators: Collaborator[]
  cursors: Record<string, { x: number; y: number }>
  setCollaborators: (collaborators: Collaborator[]) => void
  updateCursor: (id: string, position: { x: number; y: number }) => void
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  collaborators: [],
  cursors: {},
  setCollaborators: (collaborators) => set({ collaborators }),
  updateCursor: (id, position) =>
    set((state) => ({ cursors: { ...state.cursors, [id]: position } }))
}))
