import { create } from 'zustand'
import type { Annotation } from '../types/api'

type AnnotationState = {
  annotations: Annotation[]
  activeTool: string
  setAnnotations: (annotations: Annotation[]) => void
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (annotationId: string, updates: Partial<Annotation>) => void
  removeAnnotation: (annotationId: string) => void
  setActiveTool: (tool: string) => void
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  annotations: [],
  activeTool: 'select',
  setAnnotations: (annotations) => set({ annotations }),
  addAnnotation: (annotation) => set((state) => ({ annotations: [...state.annotations, annotation] })),
  updateAnnotation: (annotationId, updates) =>
    set((state) => ({
      annotations: state.annotations.map((annotation) =>
        annotation.id === annotationId ? { ...annotation, ...updates } : annotation
      )
    })),
  removeAnnotation: (annotationId) =>
    set((state) => ({ annotations: state.annotations.filter((annotation) => annotation.id !== annotationId) })),
  setActiveTool: (activeTool) => set({ activeTool })
}))
