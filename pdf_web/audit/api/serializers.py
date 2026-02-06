from __future__ import annotations

from rest_framework import serializers

from pdf_web.audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "workspace",
            "user",
            "action",
            "entity_type",
            "entity_id",
            "metadata",
            "ip",
            "user_agent",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
