from __future__ import annotations

from typing import Any

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.viewsets import ReadOnlyModelViewSet

from pdf_web.audit.utils import log_audit_event
from pdf_web.documents.models import Document
from pdf_web.documents.models import DocumentBookmark
from pdf_web.documents.models import DocumentPageAsset
from pdf_web.documents.models import DocumentStatus
from pdf_web.documents.models import DocumentVersion
from pdf_web.documents.models import Workspace
from pdf_web.documents.models import WorkspaceMember
from pdf_web.documents.models import WorkspaceRole
from pdf_web.documents.tasks import extract_metadata
from pdf_web.documents.tasks import extract_text_layout
from pdf_web.documents.tasks import index_search
from pdf_web.documents.tasks import parse_bookmarks
from pdf_web.documents.tasks import render_page_images
from pdf_web.permissions import require_role

from .serializers import DocumentBookmarkSerializer
from .serializers import DocumentCreateSerializer
from .serializers import DocumentPageAssetSerializer
from .serializers import DocumentSerializer
from .serializers import DocumentVersionSerializer
from .serializers import WorkspaceMemberSerializer
from .serializers import WorkspaceSerializer


class WorkspaceViewSet(ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(
            Q(owner=self.request.user) | Q(memberships__user=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        workspace = serializer.save(owner=self.request.user)
        WorkspaceMember.objects.create(workspace=workspace, user=self.request.user, role=WorkspaceRole.OWNER)


class WorkspaceMemberViewSet(ModelViewSet):
    serializer_class = WorkspaceMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WorkspaceMember.objects.filter(workspace__owner=self.request.user)

    def perform_create(self, serializer):
        workspace = serializer.validated_data["workspace"]
        require_role(self.request.user, workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        serializer.save()


class DocumentViewSet(ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(
            Q(workspace__owner=self.request.user) | Q(workspace__memberships__user=self.request.user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == "create":
            return DocumentCreateSerializer
        return DocumentSerializer

    def perform_create(self, serializer):
        workspace = serializer.validated_data["workspace"]
        require_role(self.request.user, workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        file_obj = serializer.validated_data["file"]
        with transaction.atomic():
            document = Document.objects.create(
                workspace=workspace,
                title=serializer.validated_data.get("title") or file_obj.name,
                created_by=self.request.user,
                status=DocumentStatus.PROCESSING,
            )
            version = DocumentVersion.objects.create(
                document=document,
                version_number=1,
                file=file_obj,
                created_by=self.request.user,
                processing_state={"upload": "completed"},
            )
            version.update_file_metadata()
            version.save(update_fields=["file_hash", "size_bytes"])
            document.current_version = version
            document.status = DocumentStatus.PROCESSING
            document.save(update_fields=["current_version", "status"])
        extract_metadata.delay(version.id)
        render_page_images.delay(version.id)
        extract_text_layout.delay(version.id)
        parse_bookmarks.delay(version.id)
        index_search.delay(version.id)
        log_audit_event(
            request=self.request,
            workspace=workspace,
            action="document.upload",
            entity_type="Document",
            entity_id=document.id,
            metadata={"version_id": version.id},
        )
        return document

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = self.perform_create(serializer)
        response_serializer = DocumentSerializer(document, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        document = self.get_object()
        log_audit_event(
            request=request,
            workspace=document.workspace,
            action="document.view",
            entity_type="Document",
            entity_id=document.id,
        )
        serializer = self.get_serializer(document)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="versions")
    def versions(self, request, pk=None):
        document = self.get_object()
        serializer = DocumentVersionSerializer(document.versions.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="chat")
    def chat(self, request, pk=None):
        from pdf_web.ai.models import ChatSession

        document = self.get_object()
        require_role(request.user, document.workspace, [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        session = ChatSession.objects.create(document=document, user=request.user)
        log_audit_event(
            request=request,
            workspace=document.workspace,
            action="ai.chat.session",
            entity_type="Document",
            entity_id=document.id,
            metadata={"session_id": session.id},
        )
        return Response({"id": session.id, "document": document.id})


class DocumentVersionViewSet(ReadOnlyModelViewSet):
    serializer_class = DocumentVersionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DocumentVersion.objects.filter(
            Q(document__workspace__owner=self.request.user)
            | Q(document__workspace__memberships__user=self.request.user)
        ).distinct()

    def retrieve(self, request, *args, **kwargs):
        version = self.get_object()
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="version.view",
            entity_type="DocumentVersion",
            entity_id=version.id,
        )
        serializer = self.get_serializer(version)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="pages")
    def pages(self, request, pk=None):
        version = self.get_object()
        assets = DocumentPageAsset.objects.filter(version=version)
        serializer = DocumentPageAssetSerializer(assets, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="layout")
    def layout(self, request, pk=None):
        version = self.get_object()
        page = request.query_params.get("page")
        layout = version.layout_json
        if page:
            layout = layout.get(str(page), []) if isinstance(layout, dict) else []
        return Response({"layout": layout})

    @action(detail=True, methods=["get"], url_path="bookmarks")
    def bookmarks(self, request, pk=None):
        version = self.get_object()
        bookmarks = DocumentBookmark.objects.filter(version=version)
        serializer = DocumentBookmarkSerializer(bookmarks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        version = self.get_object()
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="document.download",
            entity_type="DocumentVersion",
            entity_id=version.id,
        )
        if version.file:
            url = request.build_absolute_uri(version.file.url)
            return Response({"url": url})
        return Response({"detail": "No file available."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=["get"], url_path="search")
    def search(self, request, pk=None):
        version = self.get_object()
        query = request.query_params.get("q", "")
        case_sensitive = request.query_params.get("case_sensitive") == "1"
        highlight_all = request.query_params.get("highlight_all") == "1"
        text = version.text_content or ""
        if not case_sensitive:
            text_lower = text.lower()
            query_lower = query.lower()
            index = text_lower.find(query_lower)
        else:
            index = text.find(query)
        matches = []
        if query and index >= 0:
            matches.append(
                {
                    "page_number": 1,
                    "matches": [
                        {
                            "text": query,
                            "index": index,
                            "bbox": None,
                        }
                    ],
                }
            )
            if highlight_all and query:
                start = 0
                while True:
                    start = text_lower.find(query_lower, start) if not case_sensitive else text.find(query, start)
                    if start == -1:
                        break
                    matches[0]["matches"].append({"text": query, "index": start, "bbox": None})
                    start += len(query)
        return Response({"query": query, "results": matches})

    @action(detail=True, methods=["post"], url_path="flatten")
    def flatten(self, request, pk=None):
        from pdf_web.operations.models import OperationJob
        from pdf_web.operations.models import OperationType
        from pdf_web.operations.tasks import apply_operation

        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        job = OperationJob.objects.create(
            workspace=version.document.workspace,
            requested_by=request.user,
            type=OperationType.FLATTEN,
            params=request.data or {},
        )
        job.input_versions.add(version)
        apply_operation.delay(job.id)
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="document.flatten",
            entity_type="DocumentVersion",
            entity_id=version.id,
        )
        return Response({"job_id": job.id})

    @action(detail=True, methods=["post"], url_path="encrypt")
    def encrypt(self, request, pk=None):
        from pdf_web.operations.models import OperationJob
        from pdf_web.operations.models import OperationType
        from pdf_web.operations.tasks import apply_operation

        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        job = OperationJob.objects.create(
            workspace=version.document.workspace,
            requested_by=request.user,
            type=OperationType.ENCRYPT,
            params=request.data or {},
        )
        job.input_versions.add(version)
        apply_operation.delay(job.id)
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="document.encrypt",
            entity_type="DocumentVersion",
            entity_id=version.id,
        )
        return Response({"job_id": job.id})

    @action(detail=True, methods=["post", "get"], url_path="permissions")
    def permissions(self, request, pk=None):
        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.OWNER])
        if request.method == "GET":
            return Response({"security_state": version.security_state})
        version.security_state = request.data.get("security_state", {})
        version.save(update_fields=["security_state"])
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="document.permissions.update",
            entity_type="DocumentVersion",
            entity_id=version.id,
        )
        return Response({"security_state": version.security_state})

    @action(detail=True, methods=["post"], url_path="watermark")
    def watermark(self, request, pk=None):
        from pdf_web.operations.models import OperationJob
        from pdf_web.operations.models import OperationType
        from pdf_web.operations.tasks import apply_operation

        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        job = OperationJob.objects.create(
            workspace=version.document.workspace,
            requested_by=request.user,
            type=OperationType.WATERMARK,
            params=request.data or {},
        )
        job.input_versions.add(version)
        apply_operation.delay(job.id)
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="document.watermark",
            entity_type="DocumentVersion",
            entity_id=version.id,
        )
        return Response({"job_id": job.id})

    @action(detail=True, methods=["post"], url_path="ocr")
    def ocr(self, request, pk=None):
        from pdf_web.ai.tasks import ocr_document

        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        language = request.data.get("language", "eng")
        ocr_document.delay(version.id, language)
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="document.ocr",
            entity_type="DocumentVersion",
            entity_id=version.id,
            metadata={"language": language},
        )
        return Response({"status": "queued"})

    @action(detail=True, methods=["post"], url_path="embed")
    def embed(self, request, pk=None):
        from pdf_web.ai.tasks import embed_document

        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        embed_document.delay(version.id)
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="document.embed",
            entity_type="DocumentVersion",
            entity_id=version.id,
        )
        return Response({"status": "queued"})

    @action(detail=True, methods=["post"], url_path="redaction/suggest")
    def redaction_suggest(self, request, pk=None):
        from pdf_web.ai.tasks import suggest_redactions

        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        suggest_redactions.delay(version.id)
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="redaction.suggest",
            entity_type="DocumentVersion",
            entity_id=version.id,
        )
        return Response({"status": "queued"})

    @action(detail=True, methods=["post"], url_path="redaction/apply")
    def redaction_apply(self, request, pk=None):
        from pdf_web.ai.tasks import apply_redactions

        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        accepted_ids = request.data.get("accepted_ids", [])
        task_result = apply_redactions.delay(version.id, accepted_ids)
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="redaction.apply",
            entity_type="DocumentVersion",
            entity_id=version.id,
            metadata={"accepted_ids": accepted_ids},
        )
        return Response({"task_id": task_result.id})

    @action(detail=True, methods=["post"], url_path="export")
    def export(self, request, pk=None):
        from pdf_web.operations.models import OperationJob
        from pdf_web.operations.models import OperationType
        from pdf_web.operations.tasks import export_document

        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        export_format = request.data.get("format", "png")
        job = OperationJob.objects.create(
            workspace=version.document.workspace,
            requested_by=request.user,
            type=OperationType.EXPORT,
            params={"format": export_format},
        )
        job.input_versions.add(version)
        export_document.delay(job.id, version.id, export_format)
        log_audit_event(
            request=request,
            workspace=version.document.workspace,
            action="document.export",
            entity_type="DocumentVersion",
            entity_id=version.id,
            metadata={"format": export_format},
        )
        return Response({"job_id": job.id})
