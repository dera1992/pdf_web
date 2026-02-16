from __future__ import annotations

import secrets
from datetime import timedelta
from io import BytesIO
from pathlib import Path
import re
import zipfile

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
    safe = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    content = f"BT /F1 12 Tf 72 720 Td ({safe}) Tj ET"
    stream = content.encode("latin-1", errors="ignore")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    out = BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = [0]
    for idx, obj in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{idx} 0 obj\n".encode("ascii"))
        out.write(obj)
        out.write(b"\nendobj\n")

    xref_pos = out.tell()
    out.write(f"xref\n0 {len(objects)+1}\n".encode("ascii"))
    out.write(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.write(f"{offset:010d} 00000 n \n".encode("ascii"))

    out.write(
        f"trailer\n<< /Root 1 0 R /Size {len(objects)+1} >>\nstartxref\n{xref_pos}\n%%EOF".encode("ascii")
    )
    return out.getvalue()


def _extract_xml_text(xml_data: bytes) -> str:
    text = re.sub(rb"<[^>]+>", b" ", xml_data)
    text = re.sub(rb"\s+", b" ", text).strip()
    return text.decode("utf-8", errors="ignore")


def _extract_ooxml_text(source_bytes: bytes, source_name: str) -> str:
    try:
        with zipfile.ZipFile(BytesIO(source_bytes)) as archive:
            candidates: list[str]
            if source_name.endswith(".docx"):
                candidates = ["word/document.xml"]
            elif source_name.endswith(".xlsx"):
                candidates = [
                    "xl/sharedStrings.xml",
                    *[n for n in archive.namelist() if n.startswith("xl/worksheets/") and n.endswith(".xml")],
                ]
            elif source_name.endswith(".pptx"):
                candidates = [n for n in archive.namelist() if n.startswith("ppt/slides/") and n.endswith(".xml")]
            else:
                candidates = []
            fragments: list[str] = []
            for path in candidates[:12]:
                if path in archive.namelist():
                    fragments.append(_extract_xml_text(archive.read(path)))
            return " ".join(f for f in fragments if f).strip()
    except Exception:  # noqa: BLE001
        return ""


def _pdf_from_upload(version: DocumentVersion) -> bytes:
    if not version.file:
        return _minimal_pdf_bytes("Converted to PDF")
    version.file.open("rb")
    source_bytes = version.file.read()
    version.file.close()
    source_name = version.file.name.lower()

    if source_name.endswith(".pdf"):
        return source_bytes

    if source_name.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".gif")):
        try:
            from PIL import Image

            with Image.open(BytesIO(source_bytes)) as img:
                rgb = img.convert("RGB")
                buffer = BytesIO()
                rgb.save(buffer, format="PDF", resolution=150)
                return buffer.getvalue()
        except Exception:  # noqa: BLE001
            pass

    ooxml_text = _extract_ooxml_text(source_bytes, source_name)
    if ooxml_text:
        return _minimal_pdf_bytes(ooxml_text[:1200])

    text_snippet = source_bytes[:4096].decode("utf-8", errors="ignore").strip()
    if not text_snippet:
        if source_name.endswith(".doc"):
            text_snippet = "Converted Word document"
        else:
            text_snippet = f"Converted to PDF from {version.file.name}"
    return _minimal_pdf_bytes(text_snippet[:400])


def create_converted_version(version: DocumentVersion, *, target_format: str, created_by=None) -> DocumentVersion:
    document = version.document
    next_version_number = (document.versions.aggregate(max_num=models.Max("version_number")) or {}).get("max_num", 0) + 1
    base_name = Path(version.file.name).stem if version.file else f"version-{version.id}"
    extension = EXT_BY_TARGET.get(target_format, "bin")

    if target_format == "pdf":
        output_bytes = _pdf_from_upload(version)
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
