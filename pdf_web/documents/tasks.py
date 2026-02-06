from __future__ import annotations

import logging
from typing import Iterable

from celery import shared_task
from django.core.files.base import ContentFile
from django.db import transaction
from django.db import models
from django.utils import timezone

from pdf_web.documents.models import Document
from pdf_web.documents.models import DocumentBookmark
from pdf_web.documents.models import DocumentPageAsset
from pdf_web.documents.models import DocumentStatus
from pdf_web.documents.models import DocumentVersion

logger = logging.getLogger(__name__)


def _open_pdf(version: DocumentVersion):
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is required for PDF rendering.") from exc
    return fitz.open(version.file.path)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def extract_metadata(self, version_id: int) -> None:
    version = DocumentVersion.objects.get(pk=version_id)
    try:
        doc = _open_pdf(version)
        version.pdf_info = {
            "page_count": doc.page_count,
            "metadata": doc.metadata,
        }
        version.processing_state = {**version.processing_state, "metadata": "completed"}
        version.save(update_fields=["pdf_info", "processing_state"])
    except Exception as exc:  # noqa: BLE001
        version.processing_state = {**version.processing_state, "metadata": f"failed: {exc}"}
        version.save(update_fields=["processing_state"])
        logger.exception("Failed extracting metadata for version %s", version_id)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def render_page_images(self, version_id: int, dpi_list: Iterable[int] | None = None) -> None:
    version = DocumentVersion.objects.get(pk=version_id)
    dpi_list = list(dpi_list or [72, 150])
    try:
        doc = _open_pdf(version)
    except Exception as exc:  # noqa: BLE001
        version.processing_state = {**version.processing_state, "render": f"failed: {exc}"}
        version.save(update_fields=["processing_state"])
        return

    for page_index in range(doc.page_count):
        page = doc.load_page(page_index)
        for dpi in dpi_list:
            zoom = dpi / 72
            try:
                import fitz

                matrix = fitz.Matrix(zoom, zoom)
            except ImportError:
                matrix = None
            pix = page.get_pixmap(matrix=matrix) if matrix is not None else page.get_pixmap()
            img_bytes = pix.tobytes("png")
            width, height = pix.width, pix.height
            content_file = ContentFile(img_bytes)
            preview_name = f"page-{page_index + 1}-dpi-{dpi}.png"
            asset, _ = DocumentPageAsset.objects.get_or_create(
                version=version,
                page_number=page_index + 1,
                dpi=dpi,
            )
            asset.preview_image.save(preview_name, content_file, save=False)
            if dpi == min(dpi_list):
                thumb_name = f"page-{page_index + 1}-thumb.png"
                asset.thumb_image.save(thumb_name, ContentFile(img_bytes), save=False)
            asset.width = width
            asset.height = height
            asset.save()

    version.processing_state = {**version.processing_state, "render": "completed"}
    version.save(update_fields=["processing_state"])


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def extract_text_layout(self, version_id: int) -> None:
    version = DocumentVersion.objects.get(pk=version_id)
    try:
        doc = _open_pdf(version)
    except Exception as exc:  # noqa: BLE001
        version.processing_state = {**version.processing_state, "text": f"failed: {exc}"}
        version.save(update_fields=["processing_state"])
        return
    layout = {}
    text_chunks: list[str] = []
    for page_index in range(doc.page_count):
        page = doc.load_page(page_index)
        blocks = page.get_text("blocks")
        layout[str(page_index + 1)] = [
            {
                "bbox": block[:4],
                "text": block[4],
                "block_type": block[6],
            }
            for block in blocks
        ]
        text_chunks.append(page.get_text())
    version.layout_json = layout
    version.text_content = "\n".join(text_chunks)
    version.processing_state = {**version.processing_state, "text": "completed"}
    version.save(update_fields=["layout_json", "text_content", "processing_state"])


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def parse_bookmarks(self, version_id: int) -> None:
    version = DocumentVersion.objects.get(pk=version_id)
    try:
        doc = _open_pdf(version)
        toc = doc.get_toc(simple=True)
        DocumentBookmark.objects.filter(version=version).delete()
        for entry in toc:
            level, title, page = entry
            DocumentBookmark.objects.create(
                version=version,
                title=title,
                page_number=page,
                tree={"level": level},
            )
        version.processing_state = {**version.processing_state, "bookmarks": "completed"}
        version.save(update_fields=["processing_state"])
    except Exception as exc:  # noqa: BLE001
        version.processing_state = {**version.processing_state, "bookmarks": f"failed: {exc}"}
        version.save(update_fields=["processing_state"])


@shared_task(bind=True)
def index_search(self, version_id: int) -> None:
    version = DocumentVersion.objects.get(pk=version_id)
    version.processing_state = {**version.processing_state, "search": "completed"}
    version.save(update_fields=["processing_state"])


@shared_task(bind=True)
def create_new_version_from_document(self, document_id: int, source_version_id: int) -> int:
    document = Document.objects.get(pk=document_id)
    source_version = DocumentVersion.objects.get(pk=source_version_id)
    next_version_number = (document.versions.aggregate(models.Max("version_number")) or {}).get(
        "version_number__max",
        0,
    ) + 1
    with transaction.atomic():
        new_version = DocumentVersion.objects.create(
            document=document,
            version_number=next_version_number,
            file=source_version.file,
            created_by=source_version.created_by,
            processing_state={"copied_from": source_version_id},
            pdf_info=source_version.pdf_info,
            text_content=source_version.text_content,
            layout_json=source_version.layout_json,
            security_state=source_version.security_state,
        )
        new_version.update_file_metadata()
        new_version.save()
        document.current_version = new_version
        document.status = DocumentStatus.ACTIVE if hasattr(DocumentStatus, "ACTIVE") else document.status
        document.updated_at = timezone.now()
        document.save(update_fields=["current_version", "updated_at", "status"])
    return new_version.id
