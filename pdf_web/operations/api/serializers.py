from __future__ import annotations

from rest_framework import serializers

from pdf_web.operations.models import OperationJob


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
