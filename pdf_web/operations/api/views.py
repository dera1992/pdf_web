from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.viewsets import ReadOnlyModelViewSet

from pdf_web.audit.utils import log_audit_event
from pdf_web.documents.models import DocumentVersion
from pdf_web.documents.models import Workspace
from pdf_web.documents.models import WorkspaceRole
from pdf_web.operations.models import OperationJob
from pdf_web.operations.models import OperationType
from pdf_web.operations.tasks import apply_operation
from pdf_web.permissions import require_role

from .serializers import OperationJobSerializer


class OperationJobViewSet(ModelViewSet):
    serializer_class = OperationJobSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post"]

    def get_queryset(self):
        return OperationJob.objects.filter(
            Q(workspace__owner=self.request.user) | Q(workspace__memberships__user=self.request.user)
        ).distinct()

    def create_operation(self, request, operation_type: str):
        workspace_id = request.data.get("workspace")
        workspace = get_object_or_404(Workspace, pk=workspace_id)
        require_role(request.user, workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        version_ids = request.data.get("version_ids", [])
        job = OperationJob.objects.create(
            workspace=workspace,
            requested_by=request.user,
            type=operation_type,
            params=request.data or {},
        )
        if version_ids:
            job.input_versions.add(*DocumentVersion.objects.filter(id__in=version_ids))
        apply_operation.delay(job.id)
        log_audit_event(
            request=request,
            workspace=workspace,
            action=f"operation.{operation_type}",
            entity_type="OperationJob",
            entity_id=job.id,
        )
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
        return OperationJob.objects.filter(
            Q(workspace__owner=self.request.user) | Q(workspace__memberships__user=self.request.user),
            type=OperationType.EXPORT,
        ).distinct()

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        job = self.get_object()
        if not job.output_version or not job.output_version.file:
            return Response({\"detail\": \"Export not ready.\"}, status=status.HTTP_404_NOT_FOUND)
        url = request.build_absolute_uri(job.output_version.file.url)
        return Response({\"url\": url})
