import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type { Annotation } from '../types/api'

type AnnotationEntities = {
  byId: Record<string, Annotation>
  ids: string[]
}

type AnnotationsState = {
  entities: AnnotationEntities
  activeTool: string
}

type SetAnnotationsAction = { type: 'annotations/setAll'; payload: Annotation[] }
type UpsertAnnotationAction = { type: 'annotations/upsert'; payload: Annotation }
type ReconcileOptimisticAction = {
  type: 'annotations/reconcileOptimistic'
  payload: { tempId: string; saved: Annotation }
}
type PatchAnnotationAction = {
  type: 'annotations/patch'
  payload: { id: string; changes: Partial<Annotation> }
}
type RemoveAnnotationAction = { type: 'annotations/remove'; payload: string }
type SetActiveToolAction = { type: 'annotations/setActiveTool'; payload: string }

type AnnotationsAction =
  | SetAnnotationsAction
  | UpsertAnnotationAction
  | ReconcileOptimisticAction
  | PatchAnnotationAction
  | RemoveAnnotationAction
  | SetActiveToolAction

const initialState: AnnotationsState = {
  entities: { byId: {}, ids: [] },
  activeTool: 'select'
}

const normalize = (annotations: Annotation[]): AnnotationEntities => {
  const byId: Record<string, Annotation> = {}
  const ids: string[] = []

  for (const annotation of annotations) {
    byId[annotation.id] = annotation
    ids.push(annotation.id)
  }

  return { byId, ids }
}

const annotationsReducer = (state: AnnotationsState, action: AnnotationsAction): AnnotationsState => {
  switch (action.type) {
    case 'annotations/setAll': {
      return { ...state, entities: normalize(action.payload) }
    }
    case 'annotations/upsert': {
      const annotation = action.payload
      const exists = Boolean(state.entities.byId[annotation.id])
      return {
        ...state,
        entities: {
          byId: { ...state.entities.byId, [annotation.id]: annotation },
          ids: exists ? state.entities.ids : [...state.entities.ids, annotation.id]
        }
      }
    }
    case 'annotations/reconcileOptimistic': {
      const { tempId, saved } = action.payload
      const nextById = { ...state.entities.byId }
      delete nextById[tempId]
      nextById[saved.id] = saved
      const nextIds = state.entities.ids.filter((id) => id !== tempId)
      if (!nextIds.includes(saved.id)) {
        nextIds.push(saved.id)
      }
      return {
        ...state,
        entities: { byId: nextById, ids: nextIds }
      }
    }
    case 'annotations/patch': {
      const current = state.entities.byId[action.payload.id]
      if (!current) return state
      return {
        ...state,
        entities: {
          byId: {
            ...state.entities.byId,
            [action.payload.id]: { ...current, ...action.payload.changes }
          },
          ids: state.entities.ids
        }
      }
    }
    case 'annotations/remove': {
      const nextById = { ...state.entities.byId }
      delete nextById[action.payload]
      return {
        ...state,
        entities: {
          byId: nextById,
          ids: state.entities.ids.filter((id) => id !== action.payload)
        }
      }
    }
    case 'annotations/setActiveTool': {
      return { ...state, activeTool: action.payload }
    }
    default:
      return state
  }
}

const StateContext = createContext<AnnotationsState | null>(null)
const DispatchContext = createContext<Dispatch<AnnotationsAction> | null>(null)

export const AnnotationsProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(annotationsReducer, initialState)
  const stableState = useMemo(() => state, [state])

  return (
    <StateContext.Provider value={stableState}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  )
}

export const useAnnotationsState = () => {
  const state = useContext(StateContext)
  if (!state) {
    throw new Error('useAnnotationsState must be used within AnnotationsProvider')
  }
  return state
}

export const useAnnotationsDispatch = () => {
  const dispatch = useContext(DispatchContext)
  if (!dispatch) {
    throw new Error('useAnnotationsDispatch must be used within AnnotationsProvider')
  }
  return dispatch
}

export const selectActiveTool = (state: AnnotationsState) => state.activeTool

export const selectAnnotationsByPage = (state: AnnotationsState, page: number) =>
  state.entities.ids
    .map((id) => state.entities.byId[id])
    .filter((annotation): annotation is Annotation => Boolean(annotation) && annotation.page === page)

export const annotationsActions = {
  setAll: (annotations: Annotation[]): SetAnnotationsAction => ({ type: 'annotations/setAll', payload: annotations }),
  upsert: (annotation: Annotation): UpsertAnnotationAction => ({ type: 'annotations/upsert', payload: annotation }),
  reconcileOptimistic: (tempId: string, saved: Annotation): ReconcileOptimisticAction => ({
    type: 'annotations/reconcileOptimistic',
    payload: { tempId, saved }
  }),
  patch: (id: string, changes: Partial<Annotation>): PatchAnnotationAction => ({
    type: 'annotations/patch',
    payload: { id, changes }
  }),
  remove: (id: string): RemoveAnnotationAction => ({ type: 'annotations/remove', payload: id }),
  setActiveTool: (tool: string): SetActiveToolAction => ({ type: 'annotations/setActiveTool', payload: tool })
}
