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


class AsyncJobStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class VersionBoundJob(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    document = models.ForeignKey("documents.Document", on_delete=models.CASCADE)
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=16, choices=AsyncJobStatus.choices, default=AsyncJobStatus.PENDING)
    progress = models.PositiveSmallIntegerField(default=0)
    params = models.JSONField(default=dict, blank=True)
    result_version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.SET_NULL,
        related_name="%(class)s_results",
        null=True,
        blank=True,
    )
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class ConversionJob(VersionBoundJob):
    target_format = models.CharField(max_length=16)
    source_mime_type = models.CharField(max_length=128, blank=True)


class WatermarkJob(VersionBoundJob):
    pass


class PageNumberJob(VersionBoundJob):
    pass


class CropJob(VersionBoundJob):
    pass


class ShareLink(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name="share_links")
    document = models.ForeignKey("documents.Document", on_delete=models.CASCADE, related_name="share_links")
    version = models.ForeignKey(DocumentVersion, on_delete=models.CASCADE, related_name="share_links")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    token = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    password_hash = models.CharField(max_length=256, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def is_expired(self) -> bool:
        return bool(self.expires_at and timezone.now() > self.expires_at)
