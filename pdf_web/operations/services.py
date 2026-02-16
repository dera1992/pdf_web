from __future__ import annotations

import secrets
from datetime import timedelta
from io import BytesIO
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile
from xml.etree import ElementTree

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


def _is_truthy(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    if isinstance(value, (int, float)):
        return bool(value)
    return False


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


def _extract_docx_text(xml_data: bytes) -> str:
    values = re.findall(rb"<w:t[^>]*>(.*?)</w:t>", xml_data, flags=re.DOTALL)
    return " ".join(v.decode("utf-8", errors="ignore").strip() for v in values if v.strip())


def _extract_pptx_text(xml_data: bytes) -> str:
    values = re.findall(rb"<a:t[^>]*>(.*?)</a:t>", xml_data, flags=re.DOTALL)
    return " ".join(v.decode("utf-8", errors="ignore").strip() for v in values if v.strip())


def _extract_xlsx_text(archive: zipfile.ZipFile) -> str:
    strings: list[str] = []
    if "xl/sharedStrings.xml" in archive.namelist():
        root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
        for si in root.findall("{*}si"):
            text_parts = [t.text or "" for t in si.findall(".//{*}t")]
            strings.append("".join(text_parts).strip())

    values: list[str] = []
    sheet_paths = [n for n in archive.namelist() if n.startswith("xl/worksheets/") and n.endswith(".xml")]
    for sheet_path in sorted(sheet_paths)[:12]:
        root = ElementTree.fromstring(archive.read(sheet_path))
        for cell in root.findall(".//{*}c"):
            t_attr = cell.attrib.get("t")
            v = cell.find("{*}v")
            if v is None or v.text is None:
                continue
            raw = v.text.strip()
            if not raw:
                continue
            if t_attr == "s" and raw.isdigit():
                idx = int(raw)
                if 0 <= idx < len(strings):
                    if strings[idx]:
                        values.append(strings[idx])
            else:
                values.append(raw)
    return " ".join(values)


def _extract_ooxml_text(source_bytes: bytes, source_name: str) -> str:
    try:
        with zipfile.ZipFile(BytesIO(source_bytes)) as archive:
            if source_name.endswith(".docx") and "word/document.xml" in archive.namelist():
                return _extract_docx_text(archive.read("word/document.xml"))
            if source_name.endswith(".xlsx"):
                return _extract_xlsx_text(archive)
            if source_name.endswith(".pptx"):
                slides = [n for n in archive.namelist() if n.startswith("ppt/slides/") and n.endswith(".xml")]
                fragments = [_extract_pptx_text(archive.read(path)) for path in sorted(slides)[:30]]
                return " ".join(f for f in fragments if f).strip()
    except Exception:  # noqa: BLE001
        return ""
    return ""




def _convert_with_libreoffice(source_bytes: bytes, source_name: str, *, export_filter: str, prefix: str) -> bytes | None:
    soffice_bin = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice_bin:
        return None

    suffix = Path(source_name).suffix or ".xlsx"
    with tempfile.TemporaryDirectory(prefix=prefix) as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / f"input{suffix}"
        output_path = tmp_path / "input.pdf"
        input_path.write_bytes(source_bytes)

        command = [
            soffice_bin,
            "--headless",
            "--nologo",
            "--nolockcheck",
            "--nodefault",
            "--nofirststartwizard",
            "--convert-to",
            f"pdf:{export_filter}",
            str(input_path),
            "--outdir",
            str(tmp_path),
        ]
        try:
            subprocess.run(command, check=True, capture_output=True, timeout=60)
        except (subprocess.SubprocessError, OSError):
            return None

        if not output_path.exists():
            return None
        pdf_bytes = output_path.read_bytes()
        return pdf_bytes if pdf_bytes.startswith(b"%PDF") else None


def _convert_excel_with_libreoffice(source_bytes: bytes, source_name: str) -> bytes | None:
    return _convert_with_libreoffice(
        source_bytes,
        source_name,
        export_filter="calc_pdf_Export",
        prefix="excel-to-pdf-",
    )


def _convert_word_with_libreoffice(source_bytes: bytes, source_name: str) -> bytes | None:
    return _convert_with_libreoffice(
        source_bytes,
        source_name,
        export_filter="writer_pdf_Export",
        prefix="word-to-pdf-",
    )


def _convert_ppt_with_libreoffice(source_bytes: bytes, source_name: str) -> bytes | None:
    return _convert_with_libreoffice(
        source_bytes,
        source_name,
        export_filter="impress_pdf_Export",
        prefix="ppt-to-pdf-",
    )

def _pdf_from_upload(version: DocumentVersion, *, allow_excel_text_fallback: bool = False) -> bytes:
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

    if source_name.endswith((".xlsx", ".xls", ".xlsm")):
        converted_pdf = _convert_excel_with_libreoffice(source_bytes, source_name)
        if converted_pdf:
            return converted_pdf
        if not allow_excel_text_fallback:
            raise RuntimeError(
                "High-fidelity Excel to PDF conversion is unavailable. "
                "Install LibreOffice/soffice or retry with allow_text_fallback=true."
            )

    if source_name.endswith((".doc", ".docx", ".odt", ".rtf")):
        converted_pdf = _convert_word_with_libreoffice(source_bytes, source_name)
        if converted_pdf:
            return converted_pdf

    if source_name.endswith((".ppt", ".pptx", ".odp")):
        converted_pdf = _convert_ppt_with_libreoffice(source_bytes, source_name)
        if converted_pdf:
            return converted_pdf

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


def create_converted_version(
    version: DocumentVersion,
    *,
    target_format: str,
    created_by=None,
    conversion_params: dict | None = None,
) -> DocumentVersion:
    document = version.document
    next_version_number = (document.versions.aggregate(max_num=models.Max("version_number")) or {}).get("max_num", 0) + 1
    base_name = Path(version.file.name).stem if version.file else f"version-{version.id}"
    extension = EXT_BY_TARGET.get(target_format, "bin")
    conversion_params = conversion_params or {}

    if target_format == "pdf":
        output_bytes = _pdf_from_upload(
            version,
            allow_excel_text_fallback=_is_truthy(conversion_params.get("allow_text_fallback")),
        )
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
