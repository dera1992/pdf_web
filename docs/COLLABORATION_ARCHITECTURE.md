# Collaboration Architecture

## Goals
- Enable multiple users to edit and annotate documents in real time.
- Preserve consistency across clients.
- Provide auditability and conflict resolution.

## Communication Layer
- **WebSockets** for bidirectional updates.
- Fallback to polling for limited environments.

## Event Types
- `document.opened`
- `document.page.changed`
- `annotation.created`
- `annotation.updated`
- `annotation.deleted`
- `comment.created`
- `comment.replied`
- `presence.updated`

## Client Flow
1. User opens a document and joins a collaboration channel.
2. Client receives initial state (annotations, comments, permissions).
3. Local changes are dispatched to Redux and sent to the backend.
4. Backend validates and broadcasts updates to all connected clients.

## Conflict Resolution
- Use **revision numbers** for each annotation or comment.
- Reject updates with stale revisions and return current state.
- Show user a toast when an update is overwritten.

## Presence & Cursors
- Track user presence with periodic heartbeat messages.
- Optional live cursor/selection sharing for co-viewing.

## Permissions
- Role-based access (owner, editor, commenter, viewer).
- Permission checks on all mutation events.

## Audit Trail
- Store event history for document-level activity.
- Provide exportable logs for compliance.
