from __future__ import annotations

import logging
import secrets
from datetime import timedelta
from io import BytesIO
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile
from xml.sax.saxutils import escape
from xml.etree import ElementTree

from django.contrib.auth.hashers import make_password
from django.core.files.base import ContentFile
from django.db import models
from django.utils import timezone

from pdf_web.documents.models import DocumentStatus
from pdf_web.documents.models import DocumentVersion
from pdf_web.operations.models import ShareLink


logger = logging.getLogger(__name__)


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


PDF_EXPORT_FILTER_BY_EXT = {
    "docx": "docx:MS Word 2007 XML",
    "xlsx": "xlsx:Calc MS Excel 2007 XML",
    "pptx": "pptx:Impress MS PowerPoint 2007 XML",
}


XML_ILLEGAL_CHARS_RE = re.compile(r"[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]")


def _xml_safe_text(value: str) -> str:
    # Remove characters illegal in XML 1.0 and escape special XML entities.
    cleaned = XML_ILLEGAL_CHARS_RE.sub("", value)
    return escape(cleaned)


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
            completed = subprocess.run(command, check=True, capture_output=True, timeout=90)
            if completed.stderr:
                logger.debug("LibreOffice stderr for %s: %s", source_name, completed.stderr.decode("utf-8", errors="ignore"))
        except (subprocess.SubprocessError, OSError) as exc:
            logger.warning("LibreOffice PDF conversion failed for %s: %s", source_name, exc)
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


def _extract_pdf_text(source_bytes: bytes, *, max_chars: int = 4000) -> str:
    try:
        import fitz

        doc = fitz.open(stream=source_bytes, filetype="pdf")
        chunks: list[str] = []
        for page in doc:
            chunks.append(page.get_text().strip())
            if sum(len(chunk) for chunk in chunks) >= max_chars:
                break
        text = "\n".join(chunk for chunk in chunks if chunk).strip()
        return text[:max_chars]
    except Exception:  # noqa: BLE001
        return ""


def _convert_pdf_with_libreoffice(source_bytes: bytes, *, target_ext: str) -> bytes | None:
    soffice_bin = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice_bin:
        return None

    with tempfile.TemporaryDirectory(prefix=f"pdf-to-{target_ext}-") as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / "input.pdf"
        output_path = tmp_path / f"input.{target_ext}"
        input_path.write_bytes(source_bytes)

        convert_to_arg = PDF_EXPORT_FILTER_BY_EXT.get(target_ext, target_ext)

        command = [
            soffice_bin,
            "--headless",
            "--nologo",
            "--nolockcheck",
            "--nodefault",
            "--nofirststartwizard",
            "--convert-to",
            convert_to_arg,
            str(input_path),
            "--outdir",
            str(tmp_path),
        ]

        retry_commands: list[list[str]] = []
        if target_ext in PDF_EXPORT_FILTER_BY_EXT:
            # Retry with plain extension because filter names can vary by distro/build.
            retry_commands.append([*command[:7], target_ext, *command[8:]])

        try:
            completed = subprocess.run(command, check=True, capture_output=True, timeout=150)
            if completed.stderr:
                logger.debug(
                    "LibreOffice PDF->%s stderr: %s",
                    target_ext,
                    completed.stderr.decode("utf-8", errors="ignore"),
                )
        except (subprocess.SubprocessError, OSError) as exc:
            logger.warning("LibreOffice PDF->%s conversion failed: %s", target_ext, exc)
            for retry_command in retry_commands:
                try:
                    subprocess.run(retry_command, check=True, capture_output=True, timeout=150)
                    break
                except (subprocess.SubprocessError, OSError) as retry_exc:
                    logger.warning("LibreOffice retry PDF->%s failed: %s", target_ext, retry_exc)
            else:
                return None

        if not output_path.exists():
            # Some soffice builds write uppercase extensions.
            uppercase_path = tmp_path / f"input.{target_ext.upper()}"
            if uppercase_path.exists():
                output_path = uppercase_path
            else:
                logger.warning("LibreOffice PDF->%s did not generate output file", target_ext)
                return None

        if output_path.stat().st_size == 0:
            logger.warning("LibreOffice PDF->%s output is empty", target_ext)
            return None
        output = output_path.read_bytes()
        return output if output else None


def _docx_from_text(text: str) -> bytes:
    body_text = text or "Converted from PDF"
    lines = [_xml_safe_text(line) for line in body_text.splitlines()[:80] if line.strip()]
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(f"<w:p><w:r><w:t>{line}</w:t></w:r></w:p>" for line in lines)
        + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>'
    )
    content_types = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">
  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>
  <Default Extension=\"xml\" ContentType=\"application/xml\"/>
  <Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>
</Types>"""
    rels = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">
  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/>
</Relationships>"""
    out = BytesIO()
    with zipfile.ZipFile(out, mode="w") as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("word/document.xml", document_xml)
    return out.getvalue()


def _xlsx_from_text(text: str) -> bytes:
    lines = [line.strip() for line in text.splitlines() if line.strip()][:120] or ["Converted from PDF"]
    safe_lines = [_xml_safe_text(line) for line in lines]
    shared_items = "".join(f"<si><t>{line}</t></si>" for line in safe_lines)
    shared_strings = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        f'count="{len(safe_lines)}" uniqueCount="{len(safe_lines)}">{shared_items}</sst>'
    )
    rows = "".join(
        f'<row r="{i+1}"><c r="A{i+1}" t="s"><v>{i}</v></c></row>' for i in range(len(safe_lines))
    )
    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f"<sheetData>{rows}</sheetData></worksheet>"
    )
    workbook_xml = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">
  <sheets><sheet name=\"Sheet1\" sheetId=\"1\" r:id=\"rId1\"/></sheets>
</workbook>"""
    root_rels = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">
  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>
</Relationships>"""
    wb_rels = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">
  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>
  <Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings\" Target=\"sharedStrings.xml\"/>
</Relationships>"""
    content_types = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">
  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>
  <Default Extension=\"xml\" ContentType=\"application/xml\"/>
  <Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>
  <Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>
  <Override PartName=\"/xl/sharedStrings.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml\"/>
</Types>"""
    out = BytesIO()
    with zipfile.ZipFile(out, mode="w") as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", root_rels)
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", wb_rels)
        archive.writestr("xl/worksheets/sheet1.xml", sheet_xml)
        archive.writestr("xl/sharedStrings.xml", shared_strings)
    return out.getvalue()


def _pptx_from_text(text: str) -> bytes:
    first_line = (text or "Converted from PDF").splitlines()[0][:200]
    slide_text = _xml_safe_text(first_line)
    content_types = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">
  <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>
  <Default Extension=\"xml\" ContentType=\"application/xml\"/>
  <Override PartName=\"/ppt/presentation.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml\"/>
  <Override PartName=\"/ppt/slides/slide1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slide+xml\"/>
</Types>"""
    rels = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">
  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"ppt/presentation.xml\"/>
</Relationships>"""
    presentation_xml = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<p:presentation xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">
  <p:sldIdLst><p:sldId id=\"256\" r:id=\"rId1\"/></p:sldIdLst>
  <p:sldSz cx=\"9144000\" cy=\"6858000\" type=\"screen4x3\"/>
  <p:notesSz cx=\"6858000\" cy=\"9144000\"/>
</p:presentation>"""
    presentation_rels = """<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">
  <Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide\" Target=\"slides/slide1.xml\"/>
</Relationships>"""
    slide_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
        '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'
        '<p:sp><p:nvSpPr><p:cNvPr id="2" name="TextBox 1"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'
        f'<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>{slide_text}</a:t></a:r></a:p></p:txBody></p:sp>'
        '</p:spTree></p:cSld></p:sld>'
    )
    out = BytesIO()
    with zipfile.ZipFile(out, mode="w") as archive:
        archive.writestr("[Content_Types].xml", content_types)
        archive.writestr("_rels/.rels", rels)
        archive.writestr("ppt/presentation.xml", presentation_xml)
        archive.writestr("ppt/_rels/presentation.xml.rels", presentation_rels)
        archive.writestr("ppt/slides/slide1.xml", slide_xml)
    return out.getvalue()

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
    source_bytes = b""
    source_name = ""
    if version.file:
        version.file.open("rb")
        source_bytes = version.file.read()
        version.file.close()
        source_name = version.file.name.lower()

    if target_format == "pdf":
        output_bytes = _pdf_from_upload(
            version,
            allow_excel_text_fallback=_is_truthy(conversion_params.get("allow_text_fallback")),
        )
    elif target_format == "jpg" and source_name.endswith(".pdf"):
        try:
            import fitz

            doc = fitz.open(stream=source_bytes, filetype="pdf")
            pix = doc.load_page(0).get_pixmap(matrix=fitz.Matrix(2, 2))
            output_bytes = pix.tobytes("jpeg")
        except Exception:  # noqa: BLE001
            output_bytes = b"\xff\xd8\xff\xdb\x00C\x00" + b"0" * 128 + b"\xff\xd9"
    elif target_format in {"word", "excel", "ppt"} and source_name.endswith(".pdf"):
        target_ext = EXT_BY_TARGET.get(target_format, "bin")
        converted = _convert_pdf_with_libreoffice(source_bytes, target_ext=target_ext)
        if converted:
            output_bytes = converted
        else:
            text = _extract_pdf_text(source_bytes)
            if target_format == "word":
                output_bytes = _docx_from_text(text)
            elif target_format == "excel":
                output_bytes = _xlsx_from_text(text)
            else:
                output_bytes = _pptx_from_text(text)
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
