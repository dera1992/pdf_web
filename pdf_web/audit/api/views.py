from __future__ import annotations

from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from pdf_web.audit.models import AuditLog

from .serializers import AuditLogSerializer


class AuditLogViewSet(ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = AuditLog.objects.filter(
            Q(workspace__owner=self.request.user) | Q(workspace__memberships__user=self.request.user)
        )
        document_id = self.request.query_params.get("document_id")
        action = self.request.query_params.get("action")
        created_from = self.request.query_params.get("from")
        created_to = self.request.query_params.get("to")
        if document_id:
            queryset = queryset.filter(
                Q(entity_type="Document", entity_id=document_id) | Q(metadata__document_id=document_id)
            )
        if action:
            queryset = queryset.filter(action=action)
        if created_from:
            queryset = queryset.filter(created_at__gte=created_from)
        if created_to:
            queryset = queryset.filter(created_at__lte=created_to)
        return queryset
