from __future__ import annotations

from django.conf import settings
from rest_framework import serializers

from pdf_web.documents.models import Document
from pdf_web.documents.models import DocumentBookmark
from pdf_web.documents.models import DocumentPageAsset
from pdf_web.documents.models import DocumentVersion
from pdf_web.documents.models import Workspace
from pdf_web.documents.models import WorkspaceMember


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "owner", "created_at"]
        read_only_fields = ["id", "owner", "created_at"]


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceMember
        fields = ["id", "workspace", "user", "role"]
        read_only_fields = ["id"]


class DocumentVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentVersion
        fields = [
            "id",
            "document",
            "version_number",
            "file",
            "file_hash",
            "size_bytes",
            "created_by",
            "created_at",
            "processing_state",
            "pdf_info",
            "text_content",
            "layout_json",
            "security_state",
        ]
        read_only_fields = [
            "id",
            "file_hash",
            "size_bytes",
            "created_at",
            "processing_state",
            "pdf_info",
            "text_content",
            "layout_json",
            "security_state",
        ]


class DocumentSerializer(serializers.ModelSerializer):
    current_version = DocumentVersionSerializer(read_only=True)

    class Meta:
        model = Document
        fields = [
            "id",
            "workspace",
            "title",
            "created_by",
            "created_at",
            "updated_at",
            "status",
            "current_version",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at", "status", "current_version"]


class DocumentCreateSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)

    class Meta:
        model = Document
        fields = ["id", "workspace", "title", "file"]
        read_only_fields = ["id"]

    def validate_file(self, value):
        max_size = getattr(settings, "PDF_MAX_UPLOAD_SIZE", 25 * 1024 * 1024)
        if value.size > max_size:
            raise serializers.ValidationError("File too large.")
        if value.content_type not in {"application/pdf", "application/x-pdf"}:
            raise serializers.ValidationError("Only PDF files are allowed.")
        return value


class DocumentPageAssetSerializer(serializers.ModelSerializer):
    thumb_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentPageAsset
        fields = [
            "id",
            "page_number",
            "thumb_url",
            "preview_url",
            "width",
            "height",
            "dpi",
        ]

    def get_thumb_url(self, obj):
        request = self.context.get("request")
        if obj.thumb_image and request:
            return request.build_absolute_uri(obj.thumb_image.url)
        return obj.thumb_image.url if obj.thumb_image else None

    def get_preview_url(self, obj):
        request = self.context.get("request")
        if obj.preview_image and request:
            return request.build_absolute_uri(obj.preview_image.url)
        return obj.preview_image.url if obj.preview_image else None


class DocumentBookmarkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentBookmark
        fields = ["id", "title", "page_number", "tree"]
