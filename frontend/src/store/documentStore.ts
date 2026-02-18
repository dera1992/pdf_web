import { create } from 'zustand'
import type { Document } from '../types/api'

type DocumentState = {
  documents: Document[]
  activeDocument: Document | null
  activeVersionId: string | null
  setDocuments: (documents: Document[]) => void
  setActiveDocument: (document: Document | null) => void
  setActiveVersionId: (versionId: string | null) => void
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  activeDocument: null,
  activeVersionId: null,
  setDocuments: (documents) => set({ documents }),
  setActiveDocument: (document) => set({ activeDocument: document }),
  setActiveVersionId: (activeVersionId) => set({ activeVersionId })
}))
