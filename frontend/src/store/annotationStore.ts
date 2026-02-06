import { create } from 'zustand'
import type { Annotation } from '../types/api'

type AnnotationState = {
  annotations: Annotation[]
  activeTool: string
  setAnnotations: (annotations: Annotation[]) => void
  setActiveTool: (tool: string) => void
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],
  activeTool: 'select',
  setAnnotations: (annotations) => set({ annotations }),
  setActiveTool: (activeTool) => set({ activeTool })
}))
