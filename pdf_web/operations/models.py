from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from pdf_web.documents.models import DocumentVersion
from pdf_web.documents.models import Workspace


class OperationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class OperationType(models.TextChoices):
    MERGE = "merge", "Merge"
    SPLIT = "split", "Split"
    REORDER = "reorder", "Reorder"
    ROTATE = "rotate", "Rotate"
    DELETE_PAGES = "delete_pages", "Delete Pages"
    COMPRESS = "compress", "Compress"
    FLATTEN = "flatten", "Flatten"
    EXPORT = "export", "Export"
    WATERMARK = "watermark", "Watermark"
    ENCRYPT = "encrypt", "Encrypt"
    REDACT = "redact", "Redact"


class OperationJob(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="operation_jobs",
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="operation_jobs",
    )
    created_at = models.DateTimeField(default=timezone.now)
    type = models.CharField(max_length=32, choices=OperationType.choices)
    input_versions = models.ManyToManyField(DocumentVersion, related_name="operation_jobs")
    params = models.JSONField(default=dict, blank=True)
    status = models.CharField(
        max_length=16,
        choices=OperationStatus.choices,
        default=OperationStatus.PENDING,
    )
    output_version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="output_jobs",
    )
    log = models.TextField(blank=True)
    error = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
