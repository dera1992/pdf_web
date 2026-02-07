from __future__ import annotations

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from pdf_web.annotations.models import CollabEvent
from pdf_web.annotations.models import PresenceSession
from pdf_web.annotations.models import Annotation
from pdf_web.annotations.models import Comment
from pdf_web.documents.models import Document
from pdf_web.permissions import get_workspace_role
from pdf_web.permissions import has_role
from pdf_web.documents.models import WorkspaceRole
from pdf_web.users.models import User

from pdf_web.annotations.api.serializers import AnnotationSerializer
from pdf_web.annotations.api.serializers import CommentSerializer


class DocumentCollaborationConsumer(AsyncJsonWebsocketConsumer):
    allowed_events = {
        "document.opened",
        "document.page.changed",
        "annotation.created",
        "annotation.updated",
        "annotation.deleted",
        "comment.created",
        "comment.replied",
        "presence.updated",
        "presence.heartbeat",
        "cursor.updated",
    }

    async def connect(self):
        self.document_id = self.scope["url_route"]["kwargs"]["document_id"]
        self.group_name = f"document_{self.document_id}"
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return
        if not await self._has_document_access(user.id):
            await self.close()
            return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self._create_presence(user.id)
        await self._log_event("presence.join", {"user_id": user.id})
        await self._send_initial_state(user.id)
        await self._broadcast_presence()

    async def disconnect(self, close_code):
        user = self.scope.get("user")
        if user and user.is_authenticated:
            await self._log_event("presence.leave", {"user_id": user.id})
            await self._remove_presence()
            await self._broadcast_presence()
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        event_type = content.get("event_type")
        event = content.get("event", {})
        if not event_type or event_type not in self.allowed_events:
            return
        user = self.scope.get("user")
        if event_type == "presence.heartbeat" and user and user.is_authenticated:
            await self._update_presence()
            await self._broadcast_presence()
            return
        await self._log_event(event_type, event)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "collab.message",
                "event_type": event_type,
                "event": event,
                "user_id": user.id if user else None,
            },
        )

    async def collab_message(self, event):
        await self.send_json(event)

    @database_sync_to_async
    def _create_presence(self, user_id: int) -> None:
        document = Document.objects.get(pk=self.document_id)
        PresenceSession.objects.update_or_create(
            document=document,
            connection_id=self.channel_name,
            defaults={"user_id": user_id},
        )

    @database_sync_to_async
    def _remove_presence(self) -> None:
        PresenceSession.objects.filter(connection_id=self.channel_name).delete()

    @database_sync_to_async
    def _update_presence(self) -> None:
        PresenceSession.objects.filter(connection_id=self.channel_name).update(last_seen_at=timezone.now())

    @database_sync_to_async
    def _log_event(self, event_type: str, event: dict) -> None:
        document = Document.objects.get(pk=self.document_id)
        user = self.scope.get("user")
        CollabEvent.objects.create(
            document=document,
            user=user if user and user.is_authenticated else None,
            event_type=event_type,
            event=event,
        )

    @database_sync_to_async
    def _has_document_access(self, user_id: int) -> bool:
        document = Document.objects.get(pk=self.document_id)
        user = User.objects.get(pk=user_id)
        return has_role(user, document.workspace, [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])

    @database_sync_to_async
    def _get_initial_state(self, user_id: int) -> dict:
        document = Document.objects.get(pk=self.document_id)
        user = User.objects.get(pk=user_id)
        annotations = Annotation.objects.filter(document=document, is_deleted=False)
        comments = Comment.objects.filter(document=document, is_deleted=False)
        return {
            "annotations": AnnotationSerializer(annotations, many=True).data,
            "comments": CommentSerializer(comments, many=True).data,
            "role": get_workspace_role(user, document.workspace),
        }

    async def _send_initial_state(self, user_id: int) -> None:
        payload = await self._get_initial_state(user_id)
        await self.send_json({"event_type": "document.opened", "event": payload})

    @database_sync_to_async
    def _get_presence_users(self) -> list[dict]:
        sessions = PresenceSession.objects.filter(document_id=self.document_id)
        users = (
            User.objects.filter(presence_sessions__document_id=self.document_id)
            .distinct()
            .values("id", "email", "name")
        )
        last_seen = {session.user_id: session.last_seen_at for session in sessions if session.user_id}
        return [
            {
                "user_id": user["id"],
                "email": user["email"],
                "name": user["name"],
                "last_seen_at": last_seen.get(user["id"]),
            }
            for user in users
        ]

    async def _broadcast_presence(self) -> None:
        users = await self._get_presence_users()
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "collab.message",
                "event_type": "presence.updated",
                "event": {"users": users},
            },
        )
