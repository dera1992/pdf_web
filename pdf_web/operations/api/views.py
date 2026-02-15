from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.viewsets import ReadOnlyModelViewSet

from pdf_web.audit.utils import log_audit_event
from pdf_web.documents.models import Document
from pdf_web.documents.models import DocumentVersion
from pdf_web.documents.models import Workspace
from pdf_web.documents.models import WorkspaceRole
from pdf_web.operations.api.serializers import ConversionJobSerializer
from pdf_web.operations.api.serializers import OperationJobSerializer
from pdf_web.operations.models import ConversionJob
from pdf_web.operations.models import OperationJob
from pdf_web.operations.models import OperationType
from pdf_web.operations.tasks import apply_operation
from pdf_web.operations.tasks import process_conversion_job
from pdf_web.permissions import require_role


class OperationJobViewSet(ModelViewSet):
    serializer_class = OperationJobSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post"]

    def get_queryset(self):
        return OperationJob.objects.filter(Q(workspace__owner=self.request.user) | Q(workspace__memberships__user=self.request.user)).distinct()

    def create_operation(self, request, operation_type: str):
        workspace = get_object_or_404(Workspace, pk=request.data.get("workspace"))
        require_role(request.user, workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        job = OperationJob.objects.create(workspace=workspace, requested_by=request.user, type=operation_type, params=request.data or {})
        version_ids = request.data.get("version_ids", [])
        if version_ids:
            job.input_versions.add(*DocumentVersion.objects.filter(id__in=version_ids))
        apply_operation.delay(job.id)
        log_audit_event(request=request, workspace=workspace, action=f"operation.{operation_type}", entity_type="OperationJob", entity_id=job.id)
        return Response(OperationJobSerializer(job).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="merge")
    def merge(self, request):
        return self.create_operation(request, OperationType.MERGE)

    @action(detail=False, methods=["post"], url_path="split")
    def split(self, request):
        return self.create_operation(request, OperationType.SPLIT)

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        return self.create_operation(request, OperationType.REORDER)

    @action(detail=False, methods=["post"], url_path="rotate")
    def rotate(self, request):
        return self.create_operation(request, OperationType.ROTATE)

    @action(detail=False, methods=["post"], url_path="delete-pages")
    def delete_pages(self, request):
        return self.create_operation(request, OperationType.DELETE_PAGES)

    @action(detail=False, methods=["post"], url_path="compress")
    def compress(self, request):
        return self.create_operation(request, OperationType.COMPRESS)


class ExportJobViewSet(ReadOnlyModelViewSet):
    serializer_class = OperationJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OperationJob.objects.filter(Q(workspace__owner=self.request.user) | Q(workspace__memberships__user=self.request.user), type=OperationType.EXPORT).distinct()


class ConvertToPdfView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, source: str):
        workspace = get_object_or_404(Workspace, pk=request.data.get("workspace"))
        require_role(request.user, workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "file is required"}, status=400)
        document = Document.objects.create(workspace=workspace, title=upload.name, created_by=request.user)
        version = DocumentVersion.objects.create(document=document, version_number=1, file=upload, created_by=request.user, processing_state={"upload": "completed"})
        document.current_version = version
        document.save(update_fields=["current_version"])
        job = ConversionJob.objects.create(
            workspace=workspace,
            document=document,
            version=version,
            requested_by=request.user,
            target_format="pdf",
            source_mime_type=source,
            params=request.data.dict(),
        )
        process_conversion_job.delay(job.id)
        return Response(ConversionJobSerializer(job, context={"request": request}).data, status=202)
