from __future__ import annotations

import secrets
from datetime import timedelta

from django.contrib.auth.hashers import make_password
from django.db import models
from django.utils import timezone

from pdf_web.documents.models import DocumentStatus
from pdf_web.documents.models import DocumentVersion
from pdf_web.operations.models import ShareLink


def clone_version(version: DocumentVersion, *, created_by=None, processing_state: dict | None = None) -> DocumentVersion:
    document = version.document
    next_version_number = (document.versions.aggregate(max_num=models.Max("version_number")) or {}).get("max_num", 0) + 1
    new_version = DocumentVersion.objects.create(
        document=document,
        version_number=next_version_number,
        file=version.file,
        created_by=created_by or version.created_by,
        processing_state=processing_state or {"copied_from": version.id},
        pdf_info=version.pdf_info,
        text_content=version.text_content,
        layout_json=version.layout_json,
        security_state=version.security_state,
    )
    new_version.update_file_metadata()
    new_version.save()
    document.current_version = new_version
    document.status = DocumentStatus.ACTIVE
    document.updated_at = timezone.now()
    document.save(update_fields=["current_version", "updated_at", "status"])
    return new_version


def create_share_link(*, version: DocumentVersion, user, expires_in_hours: int | None, password: str | None) -> ShareLink:
    expires_at = timezone.now() + timedelta(hours=expires_in_hours) if expires_in_hours else None
    return ShareLink.objects.create(
        workspace=version.document.workspace,
        document=version.document,
        version=version,
        created_by=user,
        token=secrets.token_urlsafe(32),
        expires_at=expires_at,
        password_hash=make_password(password) if password else "",
    )
