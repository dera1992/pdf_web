from __future__ import annotations

from rest_framework import serializers

from pdf_web.ai.models import ChatMessage
from pdf_web.ai.models import ChatSession
from pdf_web.ai.models import EmbeddingChunk
from pdf_web.ai.models import OcrJob
from pdf_web.ai.models import RedactionSuggestion


class OcrJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = OcrJob
        fields = ["id", "version", "status", "language", "created_at", "finished_at", "output_version"]
        read_only_fields = ["id", "status", "created_at", "finished_at", "output_version"]


class EmbeddingChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmbeddingChunk
        fields = ["id", "version", "page_number", "chunk_index", "text", "metadata"]
        read_only_fields = ["id"]


class ChatSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatSession
        fields = ["id", "document", "user", "created_at"]
        read_only_fields = ["id", "user", "created_at"]


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ["id", "session", "role", "content", "created_at"]
        read_only_fields = ["id", "created_at"]


class RedactionSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RedactionSuggestion
        fields = [
            "id",
            "version",
            "page_number",
            "quads",
            "label",
            "confidence",
            "text_snippet",
            "status",
        ]
        read_only_fields = ["id"]
