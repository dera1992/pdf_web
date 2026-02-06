from __future__ import annotations

from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from pdf_web.ai.models import ChatMessage
from pdf_web.ai.models import ChatSession
from pdf_web.ai.models import EmbeddingChunk
from pdf_web.ai.models import RedactionSuggestion
from pdf_web.documents.models import WorkspaceRole
from pdf_web.permissions import require_role

from .serializers import ChatMessageSerializer
from .serializers import ChatSessionSerializer
from .serializers import RedactionSuggestionSerializer


class ChatSessionViewSet(ModelViewSet):
    serializer_class = ChatSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(
            Q(document__workspace__owner=self.request.user)
            | Q(document__workspace__memberships__user=self.request.user)
        ).distinct()

    @action(detail=True, methods=["post"], url_path="message")
    def message(self, request, pk=None):
        session = self.get_object()
        require_role(
            request.user,
            session.document.workspace,
            [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        user_message = request.data.get("content", "")
        ChatMessage.objects.create(session=session, role="user", content=user_message)
        chunks = EmbeddingChunk.objects.filter(version=session.document.current_version).order_by("id")[:5]
        sources = [chunk.text for chunk in chunks]
        assistant_content = "MVP response. Sources: " + " ".join(sources)
        message = ChatMessage.objects.create(session=session, role="assistant", content=assistant_content)
        return Response(ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class RedactionSuggestionViewSet(ModelViewSet):
    serializer_class = RedactionSuggestionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RedactionSuggestion.objects.filter(
            Q(version__document__workspace__owner=self.request.user)
            | Q(version__document__workspace__memberships__user=self.request.user)
        ).distinct()
