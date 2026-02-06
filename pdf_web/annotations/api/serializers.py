from __future__ import annotations

from rest_framework import serializers

from pdf_web.annotations.models import Annotation
from pdf_web.annotations.models import AnnotationRevision
from pdf_web.annotations.models import CollabEvent


class AnnotationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Annotation
        fields = [
            "id",
            "document",
            "version",
            "page_number",
            "type",
            "payload",
            "created_by",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "is_deleted"]


class AnnotationRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnnotationRevision
        fields = ["id", "annotation", "revision_number", "payload", "changed_by", "changed_at"]
        read_only_fields = ["id", "changed_by", "changed_at"]


class CollabEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollabEvent
        fields = ["id", "document", "user", "event_type", "event", "created_at"]
        read_only_fields = ["id", "created_at"]
