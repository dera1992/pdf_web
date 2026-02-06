from __future__ import annotations

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from pdf_web.annotations.models import Annotation
from pdf_web.annotations.models import AnnotationRevision
from pdf_web.audit.utils import log_audit_event
from pdf_web.documents.models import DocumentVersion
from pdf_web.documents.models import WorkspaceRole
from pdf_web.permissions import require_role

from .serializers import AnnotationSerializer


class AnnotationViewSet(ModelViewSet):
    serializer_class = AnnotationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        return Annotation.objects.filter(
            Q(document__workspace__owner=self.request.user)
            | Q(document__workspace__memberships__user=self.request.user)
        ).distinct()

    def perform_update(self, serializer):
        require_role(
            self.request.user,
            serializer.instance.document.workspace,
            [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        annotation = serializer.save()
        revision_number = annotation.revisions.count() + 1
        AnnotationRevision.objects.create(
            annotation=annotation,
            revision_number=revision_number,
            payload=annotation.payload,
            changed_by=self.request.user,
        )
        log_audit_event(
            request=self.request,
            workspace=annotation.document.workspace,
            action="annotation.update",
            entity_type="Annotation",
            entity_id=annotation.id,
        )

    def perform_destroy(self, instance):
        require_role(
            self.request.user,
            instance.document.workspace,
            [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])
        log_audit_event(
            request=self.request,
            workspace=instance.document.workspace,
            action="annotation.delete",
            entity_type="Annotation",
            entity_id=instance.id,
        )


class VersionAnnotationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, version_id: int):
        version = get_object_or_404(DocumentVersion, pk=version_id)
        require_role(request.user, version.document.workspace, [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        page = request.query_params.get("page")
        queryset = version.annotations.filter(is_deleted=False)
        if page:
            queryset = queryset.filter(page_number=page)
        serializer = AnnotationSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, version_id: int):
        version = get_object_or_404(DocumentVersion, pk=version_id)
        require_role(request.user, version.document.workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        serializer = AnnotationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        annotation = serializer.save(
            document=version.document,
            version=version,
            created_by=request.user,
        )
        AnnotationRevision.objects.create(
            annotation=annotation,
            revision_number=1,
            payload=annotation.payload,
            changed_by=request.user,
        )
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="annotation.create",
            entity_type="Annotation",
            entity_id=annotation.id,
        )
        return Response(AnnotationSerializer(annotation).data, status=status.HTTP_201_CREATED)


class VersionAnnotationBulkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, version_id: int):
        version = get_object_or_404(DocumentVersion, pk=version_id)
        require_role(request.user, version.document.workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        items = request.data.get("items", [])
        results = []
        with transaction.atomic():
            for item in items:
                serializer = AnnotationSerializer(data=item)
                serializer.is_valid(raise_exception=True)
                annotation = serializer.save(
                    document=version.document,
                    version=version,
                    created_by=request.user,
                )
                AnnotationRevision.objects.create(
                    annotation=annotation,
                    revision_number=1,
                    payload=annotation.payload,
                    changed_by=request.user,
                )
                results.append(AnnotationSerializer(annotation).data)
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="annotation.bulk",
            entity_type="DocumentVersion",
            entity_id=version.id,
            metadata={"count": len(results)},
        )
        return Response({"items": results}, status=status.HTTP_201_CREATED)
