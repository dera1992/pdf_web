import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useCollaborationStore } from '../store/collaborationStore'
import { useAnnotationStore } from '../store/annotationStore'

export const useCollaborationSocket = (documentId: string | null) => {
  const socketRef = useRef<Socket | null>(null)
  const setCollaborators = useCollaborationStore((state) => state.setCollaborators)
  const updateCursor = useCollaborationStore((state) => state.updateCursor)
  const setAnnotations = useAnnotationStore((state) => state.setAnnotations)

  useEffect(() => {
    if (!documentId) return

    const socket = io(import.meta.env.VITE_WS_URL ?? 'http://localhost:8000', {
      transports: ['websocket'],
      auth: { documentId }
    })
    socketRef.current = socket

    socket.on('presence:update', (payload) => {
      setCollaborators(payload.users)
    })

    socket.on('cursor:update', (payload) => {
      updateCursor(payload.userId, { x: payload.x, y: payload.y })
    })

    socket.on('annotations:sync', (payload) => {
      setAnnotations(payload.annotations)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [documentId, setAnnotations, setCollaborators, updateCursor])

  return socketRef
}
