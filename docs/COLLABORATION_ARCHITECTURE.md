# Collaboration Architecture

## Goals
- Enable multiple users to edit and annotate documents in real time.
- Preserve consistency across clients.
- Provide auditability and conflict resolution.

## Implementation Status
- ✅ Real-time collaboration socket consumer is implemented at `ws/documents/<document_id>/`.
- ✅ Annotation/comment mutation APIs enforce role checks and revision-based conflict control.
- ✅ Collaboration events are persisted and can be queried via REST for fallback/polling clients.
- ✅ Presence sessions are tracked per document connection and broadcast to channel members.

## Communication Layer
- **WebSockets** for bidirectional updates (`DocumentCollaborationConsumer`).
- Fallback to polling via `GET /api/documents/<document_id>/collaboration/events/?since=<iso-datetime>`.

## Event Types
- `document.opened`
- `document.page.changed`
- `annotation.created`
- `annotation.updated`
- `annotation.deleted`
- `comment.created`
- `comment.replied`
- `presence.updated`

Supported operational events currently include:
- `presence.heartbeat`
- `cursor.updated`
- presence lifecycle events emitted by the backend (`presence.join`, `presence.leave`)

## Client Flow
1. User opens a document and joins the collaboration channel.
2. Client receives initial state (annotations, comments, role/permissions).
3. Local changes are dispatched to Redux and sent to backend APIs/sockets.
4. Backend validates, persists events, and broadcasts updates to connected clients.
5. Clients that cannot maintain sockets can poll collaboration events incrementally.

## Conflict Resolution
- Use **revision numbers** for each annotation or comment.
- Reject updates with stale revisions and return current state (`409 Conflict`).
- Show user a toast when an update is overwritten or rejected.

## Presence & Cursors
- Track user presence with heartbeat messages and `last_seen_at` updates.
- Presence updates are broadcast to all connected collaborators.
- Optional live cursor/selection sharing is supported via `cursor.updated` events.

## Permissions
- Role-based access (owner, admin, editor, commenter, viewer).
- Annotation mutation events require editor/admin/owner privileges; comment mutations also allow commenter.
- Permission checks are enforced server-side in both REST and websocket entry points.

## Audit Trail
- Collaboration events are stored (`CollabEvent`) for document activity history.
- API responses can be filtered by time (`since`) for incremental audit retrieval.
- Exportable collaboration logs are available at `/api/documents/<document_id>/collaboration/events/export/` (admin/owner).
