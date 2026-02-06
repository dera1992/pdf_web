from __future__ import annotations

import logging
import re

from celery import shared_task
from django.utils import timezone

from pdf_web.ai.models import OcrJob
from pdf_web.ai.models import OcrJobStatus
from pdf_web.ai.models import RedactionSuggestion
from pdf_web.documents.models import DocumentVersion
from pdf_web.documents.tasks import extract_metadata
from pdf_web.documents.tasks import extract_text_layout
from pdf_web.documents.tasks import parse_bookmarks
from pdf_web.documents.tasks import render_page_images
from pdf_web.ai.services import embed_document as embed_document_service

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=2)
def ocr_document(self, version_id: int, language: str = "eng") -> int:
    version = DocumentVersion.objects.get(pk=version_id)
    job = OcrJob.objects.create(version=version, status=OcrJobStatus.RUNNING, language=language)
    try:
        try:
            import ocrmypdf
        except ImportError as exc:
            raise RuntimeError("ocrmypdf not installed.") from exc
        output_path = version.file.path.replace(".pdf", f"-ocr-{job.id}.pdf")
        ocrmypdf.ocr(version.file.path, output_path, language=language, deskew=True)
        new_version = DocumentVersion.objects.create(
            document=version.document,
            version_number=version.document.versions.count() + 1,
            file=output_path,
            created_by=version.created_by,
            processing_state={"ocr": "completed"},
        )
        new_version.update_file_metadata()
        new_version.save()
        job.status = OcrJobStatus.COMPLETED
        job.output_version = new_version
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "output_version", "finished_at"])
        extract_metadata.delay(new_version.id)
        render_page_images.delay(new_version.id)
        extract_text_layout.delay(new_version.id)
        parse_bookmarks.delay(new_version.id)
        return job.id
    except Exception as exc:  # noqa: BLE001
        job.status = OcrJobStatus.FAILED
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "finished_at"])
        logger.exception("OCR failed for version %s", version_id)
        raise


@shared_task(bind=True)
def suggest_redactions(self, version_id: int) -> int:
    version = DocumentVersion.objects.get(pk=version_id)
    patterns = {
        "email": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
        "phone": re.compile(r"\+?\d[\d\s().-]{7,}\d"),
        "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    }
    RedactionSuggestion.objects.filter(version=version).delete()
    text = version.text_content or ""
    for label, pattern in patterns.items():
        for match in pattern.finditer(text):
            RedactionSuggestion.objects.create(
                version=version,
                page_number=1,
                quads={},
                label=label,
                confidence=0.5,
                text_snippet=match.group(0),
            )
    return version_id


@shared_task(bind=True)
def apply_redactions(self, version_id: int, accepted_ids: list[int]) -> int:
    version = DocumentVersion.objects.get(pk=version_id)
    suggestions = RedactionSuggestion.objects.filter(version=version, id__in=accepted_ids)
    suggestions.update(status="applied")
    new_version = DocumentVersion.objects.create(
        document=version.document,
        version_number=version.document.versions.count() + 1,
        file=version.file,
        created_by=version.created_by,
        processing_state={"redactions": "applied"},
    )
    new_version.update_file_metadata()
    new_version.save()
    return new_version.id


@shared_task(bind=True)
def embed_document(self, version_id: int) -> int:
    version = DocumentVersion.objects.get(pk=version_id)
    embed_document_service(version, version.created_by)
    return version_id
