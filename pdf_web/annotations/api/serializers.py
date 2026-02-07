from __future__ import annotations

from rest_framework import serializers

from pdf_web.annotations.models import Annotation
from pdf_web.annotations.models import AnnotationRevision
from pdf_web.annotations.models import CollabEvent
from pdf_web.annotations.models import Comment
from pdf_web.annotations.models import CommentRevision


class AnnotationSerializer(serializers.ModelSerializer):
    revision_number = serializers.SerializerMethodField()

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
            "revision_number",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "is_deleted"]

    def get_revision_number(self, obj: Annotation) -> int:
        return obj.revisions.count()


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


class CommentSerializer(serializers.ModelSerializer):
    revision_number = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "document",
            "annotation",
            "parent",
            "body",
            "created_by",
            "created_at",
            "updated_at",
            "is_deleted",
            "revision_number",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "is_deleted"]

    def get_revision_number(self, obj: Comment) -> int:
        return obj.revisions.count()


class CommentRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommentRevision
        fields = ["id", "comment", "revision_number", "body", "changed_by", "changed_at"]
        read_only_fields = ["id", "changed_by", "changed_at"]
