import { useEffect, useMemo, useRef } from 'react'
import type { Annotation } from '../types/api'
import { mapApiAnnotationToFrontend, type ApiAnnotation } from '../api/annotations'
import { useCollaborationStore } from '../store/collaborationStore'
import { annotationsActions, useAnnotationsDispatch } from '../store/annotationsRedux'
import { getStoredAccessToken } from '../store/authStore'
import { setActiveCollaborationSocket } from './collaborationChannel'

const colors = ['#f43f5e', '#22c55e', '#0ea5e9', '#f59e0b', '#7c3aed', '#14b8a6']

const colorForId = (id: string | number) => {
  const source = typeof id === 'number' ? id.toString() : id
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
}

const toWebSocketUrl = (baseUrl: string, documentId: string, accessToken?: string | null) => {
  const url = new URL(baseUrl)
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = new URL(`${protocol}//${url.host}/ws/documents/${documentId}/`)
  if (accessToken) {
    wsUrl.searchParams.set('token', accessToken)
  }
  return wsUrl.toString()
}


const toFrontendAnnotation = (value: unknown): Annotation | null => {
  if (!value || typeof value !== 'object') return null
  const maybeApi = value as Record<string, unknown>
  if ('page_number' in maybeApi && 'type' in maybeApi) {
    return mapApiAnnotationToFrontend(maybeApi as unknown as ApiAnnotation)
  }
  if ('page' in maybeApi && 'documentId' in maybeApi && 'id' in maybeApi) {
    return maybeApi as unknown as Annotation
  }
  return null
}

type CollaborationMessage = {
  event_type?: string
  event?: Record<string, unknown>
  user_id?: number | string | null
}

export const useCollaborationSocket = (documentId: string | null) => {
  const socketRef = useRef<WebSocket | null>(null)
  const heartbeatRef = useRef<number | null>(null)
  const setCollaborators = useCollaborationStore((state) => state.setCollaborators)
  const updateCursor = useCollaborationStore((state) => state.updateCursor)
  const dispatch = useAnnotationsDispatch()

  const wsBase = useMemo(() => import.meta.env.VITE_WS_URL ?? 'http://localhost:8000', [])

  useEffect(() => {
    if (!documentId) return

    const socket = new WebSocket(toWebSocketUrl(wsBase, documentId, getStoredAccessToken()))
    socketRef.current = socket

    socket.onopen = () => {
      setActiveCollaborationSocket(socket)
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current)
      }
      heartbeatRef.current = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ event_type: 'presence.heartbeat', event: {} }))
        }
      }, 25_000)
    }

    socket.onmessage = (messageEvent) => {
      let payload: CollaborationMessage
      try {
        payload = JSON.parse(messageEvent.data as string) as CollaborationMessage
      } catch {
        return
      }

      if (!payload.event_type) return

      if (payload.event_type === 'document.opened') {
        const annotations = ((payload.event?.annotations as ApiAnnotation[] | undefined) ?? []).map(mapApiAnnotationToFrontend)
        dispatch(annotationsActions.setAll(annotations))
        return
      }

      if (payload.event_type === 'presence.updated') {
        const users = (payload.event?.users as Array<{ user_id: number | string; name?: string }> | undefined) ?? []
        setCollaborators(
          users.map((user) => ({
            id: String(user.user_id),
            name: user.name || `User ${user.user_id}`,
            color: colorForId(user.user_id)
          }))
        )
        return
      }

      if (payload.event_type === 'annotation.created' || payload.event_type === 'annotation.updated') {
        const annotation = toFrontendAnnotation(payload.event?.annotation)
        if (annotation) {
          dispatch(annotationsActions.upsert(annotation))
        }
        return
      }

      if (payload.event_type === 'annotation.deleted') {
        const event = payload.event as { annotation_id?: string | number; annotation?: { id?: string | number } }
        const id = event.annotation_id ?? event.annotation?.id
        if (id !== undefined) {
          dispatch(annotationsActions.remove(String(id)))
        }
        return
      }

      if (payload.event_type === 'cursor.updated') {
        const event = payload.event as { user_id?: number | string; x?: number; y?: number }
        if (event.user_id !== undefined && typeof event.x === 'number' && typeof event.y === 'number') {
          updateCursor(String(event.user_id), { x: event.x, y: event.y })
        }
      }
    }

    return () => {
      if (heartbeatRef.current) {
        window.clearInterval(heartbeatRef.current)
        heartbeatRef.current = null
      }
      socket.close()
      socketRef.current = null
      setActiveCollaborationSocket(null)
    }
  }, [dispatch, documentId, setCollaborators, updateCursor, wsBase])

  return socketRef
}
