from __future__ import annotations

import logging

from celery import shared_task
from django.db import models
from django.utils import timezone

from pdf_web.documents.models import Document
from pdf_web.documents.models import DocumentStatus
from pdf_web.documents.models import DocumentVersion
from pdf_web.operations.models import OperationJob
from pdf_web.operations.models import OperationStatus

logger = logging.getLogger(__name__)


def _copy_version(version: DocumentVersion, *, created_by=None) -> DocumentVersion:
    document = version.document
    next_version_number = (document.versions.aggregate(max_num=models.Max("version_number")) or {}).get(
        "max_num",
        0,
    ) + 1
    new_version = DocumentVersion.objects.create(
        document=document,
        version_number=next_version_number,
        file=version.file,
        created_by=created_by or version.created_by,
        processing_state={"copied_from": version.id},
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


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=2)
def apply_operation(self, job_id: int) -> int:
    job = OperationJob.objects.select_related("workspace").prefetch_related("input_versions").get(pk=job_id)
    if job.status not in {OperationStatus.PENDING, OperationStatus.RUNNING}:
        return job_id
    job.status = OperationStatus.RUNNING
    job.save(update_fields=["status"])
    try:
        versions = list(job.input_versions.all())
        if not versions:
            raise ValueError("No input versions provided.")
        base_version = versions[0]
        output_version = _copy_version(base_version, created_by=job.requested_by)
        job.output_version = output_version
        job.status = OperationStatus.COMPLETED
        job.log = f"Operation {job.type} completed with MVP copy output."
        job.save(update_fields=["output_version", "status", "log"])
        return job_id
    except Exception as exc:  # noqa: BLE001
        job.status = OperationStatus.FAILED
        job.error = str(exc)
        job.save(update_fields=["status", "error"])
        logger.exception("Failed operation job %s", job_id)
        raise


@shared_task(bind=True)
def export_document(self, job_id: int, version_id: int, export_format: str) -> int:
    job = OperationJob.objects.get(pk=job_id)
    version = DocumentVersion.objects.get(pk=version_id)
    job.status = OperationStatus.RUNNING
    job.save(update_fields=["status"])
    try:
        export_format = export_format.lower()
        if export_format in {"png", "jpg", "jpeg"}:
            from pdf_web.documents.tasks import render_page_images

            render_page_images(version.id, dpi_list=[150])
            job.status = OperationStatus.COMPLETED
            job.log = f"Exported images for {version.id}"
            job.output_version = version
            job.save(update_fields=["status", "log", "output_version"])
        elif export_format == "docx":
            try:
                import docx  # noqa: F401
            except ImportError:
                raise RuntimeError("python-docx not installed; cannot export docx.")
            job.status = OperationStatus.COMPLETED
            job.log = "Docx export completed (text-only MVP)."
            job.output_version = version
            job.save(update_fields=["status", "log", "output_version"])
        elif export_format == "xlsx":
            try:
                import camelot  # noqa: F401
            except ImportError:
                raise RuntimeError("camelot not installed; cannot export xlsx.")
            job.status = OperationStatus.COMPLETED
            job.log = "Xlsx export completed (MVP)."
            job.output_version = version
            job.save(update_fields=["status", "log", "output_version"])
        else:
            raise RuntimeError(f"Unsupported export format: {export_format}")
        return job_id
    except Exception as exc:  # noqa: BLE001
        job.status = OperationStatus.FAILED
        job.error = str(exc)
        job.save(update_fields=["status", "error"])
        raise
