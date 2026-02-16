from __future__ import annotations

from rest_framework import serializers

from pdf_web.operations.models import ConversionJob
from pdf_web.operations.models import CropJob
from pdf_web.operations.models import OperationJob
from pdf_web.operations.models import PageNumberJob
from pdf_web.operations.models import ShareLink
from pdf_web.operations.models import WatermarkJob


class OperationJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperationJob
        fields = [
            "id",
            "workspace",
            "requested_by",
            "created_at",
            "type",
            "input_versions",
            "params",
            "status",
            "output_version",
            "log",
            "error",
        ]
        read_only_fields = ["id", "requested_by", "created_at", "status", "output_version", "log", "error"]


class AsyncJobSerializer(serializers.ModelSerializer):
    result_url = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()

    def _build_file_url(self, obj):
        request = self.context.get("request")
        if not obj.result_version or not obj.result_version.file:
            return None
        return request.build_absolute_uri(obj.result_version.file.url) if request else obj.result_version.file.url

    def get_result_url(self, obj):
        return self._build_file_url(obj)

    def get_preview_url(self, obj):
        url = self._build_file_url(obj)
        if not url or not obj.result_version or not obj.result_version.file:
            return None
        name = obj.result_version.file.name.lower()
        if name.endswith((".pdf", ".png", ".jpg", ".jpeg", ".webp")):
            return url
        return None


class ConversionJobSerializer(AsyncJobSerializer):
    class Meta:
        model = ConversionJob
        fields = ["id", "status", "progress", "target_format", "result_version", "result_url", "preview_url", "error", "created_at"]


class PageNumberJobSerializer(AsyncJobSerializer):
    class Meta:
        model = PageNumberJob
        fields = ["id", "status", "progress", "result_version", "result_url", "preview_url", "error", "created_at"]


class CropJobSerializer(AsyncJobSerializer):
    class Meta:
        model = CropJob
        fields = ["id", "status", "progress", "result_version", "result_url", "preview_url", "error", "created_at"]


class WatermarkJobSerializer(AsyncJobSerializer):
    class Meta:
        model = WatermarkJob
        fields = ["id", "status", "progress", "result_version", "result_url", "preview_url", "error", "created_at"]


class ShareLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShareLink
        fields = ["id", "token", "expires_at", "created_at", "version", "document", "workspace"]
