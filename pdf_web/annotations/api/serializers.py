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

    def validate_payload(self, payload: dict) -> dict:
        rects = payload.get("rects")
        points = payload.get("points")

        def _is_number(value):
            return isinstance(value, (int, float))

        if rects is not None:
            if not isinstance(rects, list):
                raise serializers.ValidationError("payload.rects must be a list.")
            for rect in rects:
                if not isinstance(rect, dict):
                    raise serializers.ValidationError("payload.rects entries must be objects.")
                for field in ("x", "y", "width", "height"):
                    if field not in rect or not _is_number(rect[field]):
                        raise serializers.ValidationError(f"payload.rects[].{field} must be numeric.")

        if points is not None:
            if not isinstance(points, list):
                raise serializers.ValidationError("payload.points must be a list.")
            for point in points:
                if not isinstance(point, dict):
                    raise serializers.ValidationError("payload.points entries must be objects.")
                for field in ("x", "y"):
                    if field not in point or not _is_number(point[field]):
                        raise serializers.ValidationError(f"payload.points[].{field} must be numeric.")

        if rects is None and points is None:
            raise serializers.ValidationError("payload must include either rects or points for coordinates.")

        return payload

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
