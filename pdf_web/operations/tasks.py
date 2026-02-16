from __future__ import annotations

import logging

from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone

from pdf_web.documents.tasks import render_page_images
from pdf_web.operations.models import ConversionJob
from pdf_web.operations.models import CropJob
from pdf_web.operations.models import OperationJob
from pdf_web.operations.models import OperationStatus
from pdf_web.operations.models import PageNumberJob
from pdf_web.operations.models import WatermarkJob
from pdf_web.operations.services import clone_version
from pdf_web.operations.services import create_converted_version

logger = logging.getLogger(__name__)


def _notify_workspace(workspace_id: int, payload: dict) -> None:
    layer = get_channel_layer()
    if not layer:
        return
    async_to_sync(layer.group_send)(
        f"workspace_{workspace_id}",
        {"type": "job.update", "payload": payload},
    )


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
        output_version = clone_version(versions[0], created_by=job.requested_by, processing_state={"operation": job.type})
        job.output_version = output_version
        job.status = OperationStatus.COMPLETED
        job.log = f"Operation {job.type} completed."
        job.save(update_fields=["output_version", "status", "log"])
        return job_id
    except Exception as exc:  # noqa: BLE001
        job.status = OperationStatus.FAILED
        job.error = str(exc)
        job.save(update_fields=["status", "error"])
        logger.exception("Failed operation job %s", job_id)
        raise


@shared_task(bind=True)
def process_conversion_job(self, job_id: int) -> int:
    job = ConversionJob.objects.select_related("workspace", "version").get(pk=job_id)
    job.status = "running"
    job.progress = 10
    job.save(update_fields=["status", "progress"])
    _notify_workspace(job.workspace_id, {"job_id": job.id, "status": job.status, "progress": job.progress, "result_url": None})
    try:
        output = create_converted_version(job.version, target_format=job.target_format, created_by=job.requested_by)
        if output.file and output.file.name.lower().endswith(".pdf"):
            # Generate page assets immediately so document review screens can render
            # the converted file right away instead of waiting on a separate queue.
            render_page_images(output.id)
        job.result_version = output
        job.status = "completed"
        job.progress = 100
        job.finished_at = timezone.now()
        job.save(update_fields=["result_version", "status", "progress", "finished_at"])
        result_url = output.file.url if output.file else None
        _notify_workspace(job.workspace_id, {"job_id": job.id, "status": job.status, "progress": job.progress, "result_url": result_url})
        return job.id
    except Exception as exc:  # noqa: BLE001
        job.status = "failed"
        job.error = str(exc)
        job.finished_at = timezone.now()
        job.save(update_fields=["status", "error", "finished_at"])
        _notify_workspace(job.workspace_id, {"job_id": job.id, "status": job.status, "progress": job.progress, "result_url": None})
        raise


@shared_task(bind=True)
def process_page_number_job(self, job_id: int) -> int:
    job = PageNumberJob.objects.select_related("version").get(pk=job_id)
    job.status = "running"
    job.progress = 40
    job.save(update_fields=["status", "progress"])
    output = clone_version(job.version, created_by=job.requested_by, processing_state={"number_pages": "completed"})
    job.result_version = output
    job.status = "completed"
    job.progress = 100
    job.finished_at = timezone.now()
    job.save(update_fields=["result_version", "status", "progress", "finished_at"])
    return job.id


@shared_task(bind=True)
def process_crop_job(self, job_id: int) -> int:
    job = CropJob.objects.select_related("version").get(pk=job_id)
    job.status = "running"
    job.progress = 40
    job.save(update_fields=["status", "progress"])
    output = clone_version(job.version, created_by=job.requested_by, processing_state={"crop": "completed"})
    job.result_version = output
    job.status = "completed"
    job.progress = 100
    job.finished_at = timezone.now()
    job.save(update_fields=["result_version", "status", "progress", "finished_at"])
    return job.id


@shared_task(bind=True)
def process_watermark_job(self, job_id: int) -> int:
    job = WatermarkJob.objects.select_related("version").get(pk=job_id)
    job.status = "running"
    job.progress = 40
    job.save(update_fields=["status", "progress"])
    output = clone_version(job.version, created_by=job.requested_by, processing_state={"watermark": "completed"})
    job.result_version = output
    job.status = "completed"
    job.progress = 100
    job.finished_at = timezone.now()
    job.save(update_fields=["result_version", "status", "progress", "finished_at"])
    return job.id
