from __future__ import annotations

import secrets
from datetime import timedelta
from pathlib import Path

from django.contrib.auth.hashers import make_password
from django.core.files.base import ContentFile
from django.db import models
from django.utils import timezone

from pdf_web.documents.models import DocumentStatus
from pdf_web.documents.models import DocumentVersion
from pdf_web.operations.models import ShareLink


EXT_BY_TARGET = {
    "pdf": "pdf",
    "word": "docx",
    "excel": "xlsx",
    "ppt": "pptx",
    "jpg": "jpg",
}


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


def _minimal_pdf_bytes(text: str) -> bytes:
    safe = text.replace("(", "[").replace(")", "]")
    content = f"BT /F1 12 Tf 72 720 Td ({safe}) Tj ET"
    stream = content.encode("latin-1", errors="ignore")
    return (
        b"%PDF-1.4\n"
        b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>endobj\n"
        + f"4 0 obj<< /Length {len(stream)} >>stream\n".encode("ascii")
        + stream
        + b"\nendstream endobj\n"
        + b"xref\n0 5\n0000000000 65535 f\n"
        + b"0000000010 00000 n\n0000000060 00000 n\n0000000120 00000 n\n0000000220 00000 n\n"
        + b"trailer<< /Root 1 0 R /Size 5 >>\nstartxref\n320\n%%EOF"
    )


def create_converted_version(version: DocumentVersion, *, target_format: str, created_by=None) -> DocumentVersion:
    document = version.document
    next_version_number = (document.versions.aggregate(max_num=models.Max("version_number")) or {}).get("max_num", 0) + 1
    base_name = Path(version.file.name).stem if version.file else f"version-{version.id}"
    extension = EXT_BY_TARGET.get(target_format, "bin")

    if target_format == "pdf":
        output_bytes = _minimal_pdf_bytes(f"Converted to PDF from {version.file.name if version.file else 'upload'}")
    elif target_format == "jpg":
        output_bytes = b"\xff\xd8\xff\xdb\x00C\x00" + b"0" * 128 + b"\xff\xd9"
    else:
        output_bytes = (
            f"Converted placeholder artifact\nTarget: {target_format}\nSource: {version.file.name if version.file else ''}\n".encode(
                "utf-8"
            )
        )

    new_version = DocumentVersion.objects.create(
        document=document,
        version_number=next_version_number,
        created_by=created_by or version.created_by,
        processing_state={"conversion": target_format},
        pdf_info=version.pdf_info,
        text_content=version.text_content,
        layout_json=version.layout_json,
        security_state=version.security_state,
    )
    new_version.file.save(f"{base_name}-converted.{extension}", ContentFile(output_bytes), save=False)
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
