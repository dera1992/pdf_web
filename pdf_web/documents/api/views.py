from __future__ import annotations

from typing import Any

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
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
from pdf_web.operations.api.serializers import ConversionJobSerializer
from pdf_web.operations.api.serializers import CropJobSerializer
from pdf_web.operations.api.serializers import PageNumberJobSerializer
from pdf_web.operations.api.serializers import ShareLinkSerializer
from pdf_web.operations.api.serializers import WatermarkJobSerializer
from pdf_web.operations.models import ConversionJob
from pdf_web.operations.models import CropJob
from pdf_web.operations.models import OperationJob
from pdf_web.operations.models import OperationType
from pdf_web.operations.models import PageNumberJob
from pdf_web.operations.models import WatermarkJob
from pdf_web.operations.services import clone_version
from pdf_web.operations.services import create_share_link
from pdf_web.operations.tasks import apply_operation
from pdf_web.operations.tasks import process_conversion_job
from pdf_web.operations.tasks import process_crop_job
from pdf_web.operations.tasks import process_page_number_job
from pdf_web.operations.tasks import process_watermark_job
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
        return Workspace.objects.filter(Q(owner=self.request.user) | Q(memberships__user=self.request.user)).distinct()

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
        queryset = Document.objects.filter(
            Q(workspace__owner=self.request.user) | Q(workspace__memberships__user=self.request.user)
        ).distinct()
        workspace_id = self.request.query_params.get("workspace")
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        return queryset

    def get_serializer_class(self):
        return DocumentCreateSerializer if self.action == "create" else DocumentSerializer

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
            document.save(update_fields=["current_version", "status"])
        extract_metadata.delay(version.id)
        render_page_images.delay(version.id)
        extract_text_layout.delay(version.id)
        parse_bookmarks.delay(version.id)
        index_search.delay(version.id)
        log_audit_event(request=self.request, workspace=workspace, action="document.upload", entity_type="Document", entity_id=document.id, metadata={"version_id": version.id})
        return document

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        document = self.perform_create(serializer)
        response_serializer = DocumentSerializer(document, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="chat")
    def chat(self, request, pk=None):
        from pdf_web.ai.models import ChatSession

        document = self.get_object()
        require_role(
            request.user,
            document.workspace,
            [WorkspaceRole.VIEWER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        session, _ = ChatSession.objects.get_or_create(document=document, user=request.user)
        return Response(
            {
                "id": session.id,
                "document": document.id,
                "user": request.user.id,
                "created_at": session.created_at,
            }
        )


class DocumentVersionViewSet(ReadOnlyModelViewSet):
    serializer_class = DocumentVersionSerializer
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        if self.action in {"convert_word", "convert_excel", "convert_ppt", "convert_jpg"}:
            self.throttle_scope = "conversion"
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        queryset = DocumentVersion.objects.filter(
            Q(document__workspace__owner=self.request.user) | Q(document__workspace__memberships__user=self.request.user)
        ).distinct()
        document_id = self.request.query_params.get("document")
        if document_id:
            queryset = queryset.filter(document_id=document_id)
        return queryset

    @action(detail=True, methods=["get"], url_path="render-page")
    def render_page(self, request, pk=None):
        version = self.get_object()
        page = int(request.query_params.get("page", "1"))
        asset = version.page_assets.filter(page_number=page).first()
        return Response({"page": page, "preview_url": request.build_absolute_uri(asset.preview_image.url) if asset and asset.preview_image else None})

    @action(detail=True, methods=["get"], url_path="pages")
    def pages(self, request, pk=None):
        version = self.get_object()
        serializer = DocumentPageAssetSerializer(DocumentPageAsset.objects.filter(version=version), many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="layout")
    def layout(self, request, pk=None):
        version = self.get_object()
        page = request.query_params.get("page")
        layout = version.layout_json.get(str(page), []) if page and isinstance(version.layout_json, dict) else version.layout_json
        return Response({"layout": layout})

    @action(detail=True, methods=["post"], url_path="edit-text")
    def edit_text(self, request, pk=None):
        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        layout = request.data.get("layout_json")
        text_content = request.data.get("text_content", version.text_content)
        new_version = clone_version(version, created_by=request.user, processing_state={"edit_text": "completed", "font_detection": True})
        if layout is not None:
            new_version.layout_json = layout
        new_version.text_content = text_content
        new_version.save(update_fields=["layout_json", "text_content"])
        log_audit_event(request=request, workspace=version.document.workspace, action="version.edit_text", entity_type="DocumentVersion", entity_id=new_version.id)
        return Response(DocumentVersionSerializer(new_version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="bookmarks")
    def bookmarks(self, request, pk=None):
        serializer = DocumentBookmarkSerializer(DocumentBookmark.objects.filter(version=self.get_object()), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        version = self.get_object()
        return Response({"url": request.build_absolute_uri(version.file.url)}) if version.file else Response({"detail": "No file available."}, status=404)

    @action(detail=True, methods=["get"], url_path="search")
    def search(self, request, pk=None):
        version = self.get_object()
        query = request.query_params.get("q", "")
        text = version.text_content or ""
        index = text.lower().find(query.lower()) if query else -1
        results = [{"page_number": 1, "matches": [{"text": query, "index": index, "bbox": None}]}] if index >= 0 else []
        return Response({"query": query, "results": results})

    @action(detail=True, methods=["post"], url_path="number-pages")
    def number_pages(self, request, pk=None):
        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        job = PageNumberJob.objects.create(workspace=version.document.workspace, document=version.document, version=version, requested_by=request.user, params=request.data or {})
        process_page_number_job.delay(job.id)
        return Response(PageNumberJobSerializer(job, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="crop")
    def crop(self, request, pk=None):
        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        job = CropJob.objects.create(workspace=version.document.workspace, document=version.document, version=version, requested_by=request.user, params=request.data or {})
        process_crop_job.delay(job.id)
        return Response(CropJobSerializer(job, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="redact")
    def redact(self, request, pk=None):
        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        job = OperationJob.objects.create(workspace=version.document.workspace, requested_by=request.user, type=OperationType.REDACT, params=request.data or {})
        job.input_versions.add(version)
        apply_operation.delay(job.id)
        return Response({"job_id": job.id, "status": "pending", "progress": 0, "result_url": None})

    @action(detail=True, methods=["post"], url_path="watermark")
    def watermark(self, request, pk=None):
        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        job = WatermarkJob.objects.create(workspace=version.document.workspace, document=version.document, version=version, requested_by=request.user, params=request.data or {})
        process_watermark_job.delay(job.id)
        return Response(WatermarkJobSerializer(job, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="fill-form")
    def fill_form(self, request, pk=None):
        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        output = clone_version(version, created_by=request.user, processing_state={"fill_form": "flattened"})
        return Response(DocumentVersionSerializer(output).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="share")
    def share(self, request, pk=None):
        version = self.get_object()
        link = create_share_link(
            version=version,
            user=request.user,
            expires_in_hours=request.data.get("expires_in_hours"),
            password=request.data.get("password"),
        )
        return Response(ShareLinkSerializer(link).data, status=status.HTTP_201_CREATED)

    def _queue_conversion(self, request, version, target_format: str):
        job = ConversionJob.objects.create(
            workspace=version.document.workspace,
            document=version.document,
            version=version,
            requested_by=request.user,
            target_format=target_format,
            source_mime_type="application/pdf",
            params=request.data or {},
        )
        process_conversion_job.delay(job.id)
        return Response(ConversionJobSerializer(job, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="convert/word")
    def convert_word(self, request, pk=None):
        return self._queue_conversion(request, self.get_object(), "word")

    @action(detail=True, methods=["post"], url_path="convert/excel")
    def convert_excel(self, request, pk=None):
        return self._queue_conversion(request, self.get_object(), "excel")

    @action(detail=True, methods=["post"], url_path="convert/ppt")
    def convert_ppt(self, request, pk=None):
        return self._queue_conversion(request, self.get_object(), "ppt")

    @action(detail=True, methods=["post"], url_path="convert/jpg")
    def convert_jpg(self, request, pk=None):
        return self._queue_conversion(request, self.get_object(), "jpg")

    @action(detail=True, methods=["post"], url_path="flatten")
    def flatten(self, request, pk=None):
        version = self.get_object()
        job = OperationJob.objects.create(workspace=version.document.workspace, requested_by=request.user, type=OperationType.FLATTEN, params=request.data or {})
        job.input_versions.add(version)
        apply_operation.delay(job.id)
        return Response({"job_id": job.id})

    @action(detail=True, methods=["post"], url_path="encrypt")
    def encrypt(self, request, pk=None):
        version = self.get_object()
        require_role(request.user, version.document.workspace, [WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
        job = OperationJob.objects.create(workspace=version.document.workspace, requested_by=request.user, type=OperationType.ENCRYPT, params=request.data or {})
        job.input_versions.add(version)
        apply_operation.delay(job.id)
        return Response({"job_id": job.id})

    @action(detail=True, methods=["post", "get"], url_path="permissions")
    def permissions(self, request, pk=None):
        version = self.get_object()
        if request.method == "GET":
            return Response({"security_state": version.security_state})
        version.security_state = request.data.get("security_state", {})
        version.save(update_fields=["security_state"])
        return Response({"security_state": version.security_state})

    @action(detail=True, methods=["post"], url_path="export")
    def export(self, request, pk=None):
        version = self.get_object()
        return self._queue_conversion(request, version, request.data.get("format", "jpg"))

    @action(detail=True, methods=["post"], url_path="redaction/suggest")
    def redaction_suggest(self, request, pk=None):
        from pdf_web.ai.tasks import suggest_redactions

        version = self.get_object()
        suggest_redactions.delay(version.id)
        return Response({"status": "queued"})

    @action(detail=True, methods=["post"], url_path="redaction/apply")
    def redaction_apply(self, request, pk=None):
        from pdf_web.ai.tasks import apply_redactions

        version = self.get_object()
        accepted_ids = request.data.get("accepted_ids", [])
        task_result = apply_redactions.delay(version.id, accepted_ids)
        return Response({"task_id": task_result.id})

    @action(detail=True, methods=["post"], url_path="ocr")
    def ocr(self, request, pk=None):
        from pdf_web.ai.tasks import ocr_document

        version = self.get_object()
        language = request.data.get("language", "eng")
        ocr_document.delay(version.id, language)
        return Response({"status": "queued"})
