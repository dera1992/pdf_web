import { useCollaborationStore } from '../store/collaborationStore'

export const CollaborationOverlay = () => {
  const collaborators = useCollaborationStore((state) => state.collaborators)
  const cursors = useCollaborationStore((state) => state.cursors)

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute right-6 top-6 flex items-center gap-2">
        {collaborators.map((collaborator) => (
          <div
            key={collaborator.id}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: collaborator.color }}
            title={collaborator.name}
          >
            {collaborator.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
      </div>
      {Object.entries(cursors).map(([id, position]) => (
        <div
          key={id}
          className="absolute h-3 w-3 rounded-full border border-white"
          style={{
            left: position.x,
            top: position.y,
            backgroundColor: '#f43f5e'
          }}
        />
      ))}
    </div>
  )
}
