from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone
from pgvector.django import VectorField

from pdf_web.documents.models import Document
from pdf_web.documents.models import DocumentVersion


class OcrJobStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class OcrJob(models.Model):
    version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.CASCADE,
        related_name="ocr_jobs",
    )
    status = models.CharField(max_length=16, choices=OcrJobStatus.choices, default=OcrJobStatus.PENDING)
    language = models.CharField(max_length=32, default="eng")
    created_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    output_version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ocr_output_jobs",
    )


class EmbeddingChunk(models.Model):
    version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.CASCADE,
        related_name="embedding_chunks",
    )
    page_number = models.PositiveIntegerField(default=1)
    chunk_index = models.PositiveIntegerField(default=0)
    text = models.TextField()
    embedding = VectorField(dimensions=1536)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("version", "page_number", "chunk_index")


class ChatSession(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chat_sessions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="chat_sessions",
    )
    created_at = models.DateTimeField(default=timezone.now)


class ChatMessage(models.Model):
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=16)
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)


class RedactionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"
    APPLIED = "applied", "Applied"


class RedactionSuggestion(models.Model):
    version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.CASCADE,
        related_name="redaction_suggestions",
    )
    page_number = models.PositiveIntegerField()
    quads = models.JSONField(default=dict, blank=True)
    label = models.CharField(max_length=64)
    confidence = models.FloatField(default=0.0)
    text_snippet = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=RedactionStatus.choices, default=RedactionStatus.PENDING)

    class Meta:
        ordering = ["page_number"]
