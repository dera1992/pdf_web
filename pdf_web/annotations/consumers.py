from __future__ import annotations

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from pdf_web.annotations.models import CollabEvent
from pdf_web.annotations.models import PresenceSession
from pdf_web.documents.models import Document


class DocumentCollaborationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.document_id = self.scope["url_route"]["kwargs"]["document_id"]
        self.group_name = f"document_{self.document_id}"
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close()
            return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self._create_presence(user.id)
        await self._log_event("presence.join", {"user_id": user.id})

    async def disconnect(self, close_code):
        user = self.scope.get("user")
        if user and user.is_authenticated:
            await self._log_event("presence.leave", {"user_id": user.id})
            await self._remove_presence()
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        event_type = content.get("event_type")
        event = content.get("event", {})
        if not event_type:
            return
        user = self.scope.get("user")
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
    def _log_event(self, event_type: str, event: dict) -> None:
        document = Document.objects.get(pk=self.document_id)
        user = self.scope.get("user")
        CollabEvent.objects.create(
            document=document,
            user=user if user and user.is_authenticated else None,
            event_type=event_type,
            event=event,
        )
