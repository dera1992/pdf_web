let activeSocket: WebSocket | null = null

export const setActiveCollaborationSocket = (socket: WebSocket | null) => {
  activeSocket = socket
}

export const emitCollaborationEvent = (eventType: string, event: Record<string, unknown>) => {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return
  activeSocket.send(
    JSON.stringify({
      event_type: eventType,
      event
    })
  )
}
