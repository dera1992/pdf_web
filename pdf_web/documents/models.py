from __future__ import annotations

from django.conf import settings
from django.core.files.storage import default_storage
from django.db import models
from django.utils import timezone


class WorkspaceRole(models.TextChoices):
    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    EDITOR = "editor", "Editor"
    COMMENTER = "commenter", "Commenter"
    VIEWER = "viewer", "Viewer"


class Workspace(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_workspaces",
    )
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self) -> str:
        return self.name


class WorkspaceMember(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspace_memberships",
    )
    role = models.CharField(max_length=16, choices=WorkspaceRole.choices)

    class Meta:
        unique_together = ("workspace", "user")

    def __str__(self) -> str:
        return f"{self.user} in {self.workspace}"


class DocumentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"
    PROCESSING = "processing", "Processing"
    ERROR = "error", "Error"


def document_upload_path(instance: "DocumentVersion", filename: str) -> str:
    return f"documents/{instance.document_id}/versions/{instance.version_number}/{filename}"


def asset_upload_path(instance: "DocumentPageAsset", filename: str) -> str:
    return f"documents/{instance.version_id}/pages/{instance.page_number}/{filename}"


class Document(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField(max_length=255)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_documents",
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(
        max_length=16,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PROCESSING,
    )
    current_version = models.ForeignKey(
        "DocumentVersion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_for_documents",
    )

    def __str__(self) -> str:
        return self.title


class DocumentVersion(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_number = models.PositiveIntegerField()
    file = models.FileField(upload_to=document_upload_path)
    file_hash = models.CharField(max_length=128, blank=True)
    size_bytes = models.BigIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_versions",
    )
    created_at = models.DateTimeField(default=timezone.now)
    processing_state = models.JSONField(default=dict, blank=True)
    pdf_info = models.JSONField(default=dict, blank=True)
    text_content = models.TextField(blank=True)
    layout_json = models.JSONField(default=dict, blank=True)
    security_state = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("document", "version_number")
        ordering = ["-version_number"]

    def __str__(self) -> str:
        return f"{self.document} v{self.version_number}"

    def update_file_metadata(self) -> None:
        if not self.file:
            return
        if hasattr(self.file, "size"):
            self.size_bytes = self.file.size
        try:
            if default_storage.exists(self.file.name):
                with default_storage.open(self.file.name, "rb") as handle:
                    import hashlib

                    hasher = hashlib.sha256()
                    for chunk in iter(lambda: handle.read(8192), b""):
                        hasher.update(chunk)
                    self.file_hash = hasher.hexdigest()
        except OSError:
            self.file_hash = ""


class DocumentPageAsset(models.Model):
    version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.CASCADE,
        related_name="page_assets",
    )
    page_number = models.PositiveIntegerField()
    thumb_image = models.ImageField(upload_to=asset_upload_path, blank=True)
    preview_image = models.ImageField(upload_to=asset_upload_path, blank=True)
    width = models.PositiveIntegerField(default=0)
    height = models.PositiveIntegerField(default=0)
    dpi = models.PositiveIntegerField(default=72)
    content_hash = models.CharField(max_length=128, blank=True)

    class Meta:
        unique_together = ("version", "page_number", "dpi")
        ordering = ["page_number", "dpi"]


class DocumentBookmark(models.Model):
    version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.CASCADE,
        related_name="bookmarks",
    )
    title = models.CharField(max_length=255)
    page_number = models.PositiveIntegerField()
    tree = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["page_number"]
