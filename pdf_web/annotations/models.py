from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from pdf_web.documents.models import Document
from pdf_web.documents.models import DocumentVersion


class AnnotationType(models.TextChoices):
    HIGHLIGHT = "highlight", "Highlight"
    UNDERLINE = "underline", "Underline"
    STRIKETHROUGH = "strikethrough", "Strikethrough"
    INK = "ink", "Ink"
    NOTE = "note", "Sticky Note"
    SHAPE = "shape", "Shape"
    STAMP = "stamp", "Stamp"
    FORM = "form", "Form"
    SIGNATURE = "signature", "Signature"
    TEXT_EDIT = "text_edit", "Text Edit"
    IMAGE = "image", "Image"


class Annotation(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="annotations")
    version = models.ForeignKey(
        DocumentVersion,
        on_delete=models.CASCADE,
        related_name="annotations",
    )
    page_number = models.PositiveIntegerField()
    type = models.CharField(max_length=32, choices=AnnotationType.choices)
    payload = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="annotations",
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ["page_number", "created_at"]


class AnnotationRevision(models.Model):
    annotation = models.ForeignKey(
        Annotation,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    revision_number = models.PositiveIntegerField()
    payload = models.JSONField(default=dict, blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="annotation_revisions",
    )
    changed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("annotation", "revision_number")
        ordering = ["revision_number"]


class Comment(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    annotation = models.ForeignKey(
        Annotation,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="comments",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )
    body = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="comments",
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]


class CommentRevision(models.Model):
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    revision_number = models.PositiveIntegerField()
    body = models.TextField()
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="comment_revisions",
    )
    changed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("comment", "revision_number")
        ordering = ["revision_number"]


class CollabEvent(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="collab_events",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="collab_events",
    )
    event_type = models.CharField(max_length=64)
    event = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]


class PresenceSession(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="presence_sessions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="presence_sessions",
    )
    connection_id = models.CharField(max_length=128)
    joined_at = models.DateTimeField(default=timezone.now)
    last_seen_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ("document", "connection_id")
