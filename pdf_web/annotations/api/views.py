from __future__ import annotations

from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from pdf_web.annotations.models import Annotation
from pdf_web.annotations.models import AnnotationRevision
from pdf_web.annotations.models import CollabEvent
from pdf_web.annotations.models import Comment
from pdf_web.annotations.models import CommentRevision
from pdf_web.audit.utils import log_audit_event
from pdf_web.documents.models import Document
from pdf_web.documents.models import DocumentVersion
from pdf_web.documents.models import WorkspaceRole
from pdf_web.permissions import get_workspace_role
from pdf_web.permissions import require_role

from .serializers import AnnotationSerializer
from .serializers import CollabEventSerializer
from .serializers import CommentSerializer


class AnnotationViewSet(ModelViewSet):
    serializer_class = AnnotationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        return Annotation.objects.filter(
            Q(document__workspace__owner=self.request.user)
            | Q(document__workspace__memberships__user=self.request.user)
        ).distinct()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)
        instance = self.get_object()
        require_role(
            request.user,
            instance.document.workspace,
            [WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        expected_revision = request.data.get("revision_number")
        current_revision = instance.revisions.count()
        if expected_revision is None:
            return Response(
                {"detail": "revision_number is required.", "current_revision": current_revision},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if int(expected_revision) != current_revision:
            return Response(
                {
                    "detail": "Stale revision.",
                    "current_revision": current_revision,
                    "annotation": AnnotationSerializer(instance).data,
                },
                status=status.HTTP_409_CONFLICT,
            )
        data = request.data.copy()
        data.pop("revision_number", None)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(AnnotationSerializer(instance).data)

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
        require_role(request.user, version.document.workspace, [WorkspaceRole.VIEWER, WorkspaceRole.COMMENTER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER])
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


class CommentViewSet(ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        return Comment.objects.filter(
            Q(document__workspace__owner=self.request.user)
            | Q(document__workspace__memberships__user=self.request.user)
        ).distinct()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", True)
        instance = self.get_object()
        require_role(
            request.user,
            instance.document.workspace,
            [WorkspaceRole.COMMENTER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        expected_revision = request.data.get("revision_number")
        current_revision = instance.revisions.count()
        if expected_revision is None:
            return Response(
                {"detail": "revision_number is required.", "current_revision": current_revision},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if int(expected_revision) != current_revision:
            return Response(
                {
                    "detail": "Stale revision.",
                    "current_revision": current_revision,
                    "comment": CommentSerializer(instance).data,
                },
                status=status.HTTP_409_CONFLICT,
            )
        data = request.data.copy()
        data.pop("revision_number", None)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(CommentSerializer(instance).data)

    def perform_update(self, serializer):
        comment = serializer.save()
        revision_number = comment.revisions.count() + 1
        CommentRevision.objects.create(
            comment=comment,
            revision_number=revision_number,
            body=comment.body,
            changed_by=self.request.user,
        )
        log_audit_event(
            request=self.request,
            workspace=comment.document.workspace,
            action="comment.update",
            entity_type="Comment",
            entity_id=comment.id,
        )

    def perform_destroy(self, instance):
        require_role(
            self.request.user,
            instance.document.workspace,
            [WorkspaceRole.COMMENTER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])
        log_audit_event(
            request=self.request,
            workspace=instance.document.workspace,
            action="comment.delete",
            entity_type="Comment",
            entity_id=instance.id,
        )


class DocumentCommentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, document_id: int):
        document = get_object_or_404(Document, pk=document_id)
        require_role(
            request.user,
            document.workspace,
            [WorkspaceRole.VIEWER, WorkspaceRole.COMMENTER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        queryset = document.comments.filter(is_deleted=False)
        serializer = CommentSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, document_id: int):
        document = get_object_or_404(Document, pk=document_id)
        require_role(
            request.user,
            document.workspace,
            [WorkspaceRole.COMMENTER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(document=document, created_by=request.user)
        CommentRevision.objects.create(
            comment=comment,
            revision_number=1,
            body=comment.body,
            changed_by=request.user,
        )
        log_audit_event(
            request=request,
            workspace=document.workspace,
            action="comment.create",
            entity_type="Comment",
            entity_id=comment.id,
        )
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class CollaborationEventListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, document_id: int):
        document = get_object_or_404(Document, pk=document_id)
        require_role(
            request.user,
            document.workspace,
            [WorkspaceRole.VIEWER, WorkspaceRole.COMMENTER, WorkspaceRole.EDITOR, WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )
        queryset = CollabEvent.objects.filter(document=document)
        since = request.query_params.get("since")
        if since:
            parsed = parse_datetime(since)
            if parsed:
                queryset = queryset.filter(created_at__gt=parsed)
        serializer = CollabEventSerializer(queryset[:500], many=True)
        return Response(
            {
                "events": serializer.data,
                "role": get_workspace_role(request.user, document.workspace),
            }
        )


class CollaborationEventExportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, document_id: int):
        document = get_object_or_404(Document, pk=document_id)
        require_role(
            request.user,
            document.workspace,
            [WorkspaceRole.ADMIN, WorkspaceRole.OWNER],
        )

        queryset = CollabEvent.objects.filter(document=document).order_by("created_at")
        since = request.query_params.get("since")
        if since:
            parsed = parse_datetime(since)
            if parsed:
                queryset = queryset.filter(created_at__gt=parsed)

        events = CollabEventSerializer(queryset[:5000], many=True).data
        return Response(
            {
                "document_id": document.id,
                "count": len(events),
                "events": events,
            },
            headers={
                "Content-Disposition": f'attachment; filename="document-{document.id}-collaboration-events.json"',
            },
        )
