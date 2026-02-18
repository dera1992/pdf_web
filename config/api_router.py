from django.conf import settings
from django.urls import include, path
from rest_framework.routers import DefaultRouter, SimpleRouter

# Users
from pdf_web.users.api.views import UserViewSet

# Workspaces / Documents
from pdf_web.documents.api.views import (
    DocumentViewSet,
    DocumentVersionViewSet,
    WorkspaceMemberViewSet,
    WorkspaceViewSet,
)

# Annotations
from pdf_web.annotations.api.views import (
    AnnotationViewSet,
    CollaborationEventExportView,
    CollaborationEventListView,
    CommentViewSet,
    DocumentCommentsView,
    VersionAnnotationBulkView,
    VersionAnnotationsView,
)

# Operations / Export
from pdf_web.operations.api.views import (
    ConvertFromPdfView,
    ConvertToPdfView,
    ExportJobViewSet,
    OperationJobViewSet,
)

# AI
from pdf_web.ai.api.views import (
    ChatSessionViewSet,
    RedactionSuggestionViewSet,
)

# Audit
from pdf_web.audit.api.views import AuditLogViewSet


# ------------------------------------------------------------------------------
# Router Selection
# ------------------------------------------------------------------------------
router = DefaultRouter() if settings.DEBUG else SimpleRouter()


# ------------------------------------------------------------------------------
# ViewSet Registrations
# ------------------------------------------------------------------------------
router.register("users", UserViewSet)
router.register("workspaces", WorkspaceViewSet, basename="workspace")
router.register("workspace-members", WorkspaceMemberViewSet, basename="workspace-member")
router.register("documents", DocumentViewSet, basename="document")
router.register("versions", DocumentVersionViewSet, basename="version")
router.register("annotations", AnnotationViewSet, basename="annotation")
router.register("comments", CommentViewSet, basename="comment")
router.register("operations", OperationJobViewSet, basename="operation")
router.register("exports", ExportJobViewSet, basename="export")
router.register("chat", ChatSessionViewSet, basename="chat")
router.register("redactions", RedactionSuggestionViewSet, basename="redaction")
router.register("audit", AuditLogViewSet, basename="audit")


# ------------------------------------------------------------------------------
# URL Patterns
# ------------------------------------------------------------------------------
app_name = "api"

urlpatterns = [
    # ViewSet router URLs
    *router.urls,

    # Auth + Profile endpoints
    path("", include("pdf_web.users.api.urls")),

    path("convert/word-to-pdf/", ConvertToPdfView.as_view(), {"source": "word"}, name="word-to-pdf"),
    path("convert/excel-to-pdf/", ConvertToPdfView.as_view(), {"source": "excel"}, name="excel-to-pdf"),
    path("convert/ppt-to-pdf/", ConvertToPdfView.as_view(), {"source": "ppt"}, name="ppt-to-pdf"),
    path("convert/jpg-to-pdf/", ConvertToPdfView.as_view(), {"source": "jpg"}, name="jpg-to-pdf"),
    path("convert/pdf-to-word/", ConvertFromPdfView.as_view(), {"target": "word"}, name="pdf-to-word"),
    path("convert/pdf-to-excel/", ConvertFromPdfView.as_view(), {"target": "excel"}, name="pdf-to-excel"),
    path("convert/pdf-to-ppt/", ConvertFromPdfView.as_view(), {"target": "ppt"}, name="pdf-to-ppt"),
    path("convert/pdf-to-jpg/", ConvertFromPdfView.as_view(), {"target": "jpg"}, name="pdf-to-jpg"),

    # PDF Editor URLs
    path("", include("pdf_web.pdfeditor.urls")),

    # Version Annotation Endpoints
    path(
        "versions/<int:version_id>/annotations/",
        VersionAnnotationsView.as_view(),
        name="version-annotations",
    ),
    path(
        "versions/<int:version_id>/annotations/bulk/",
        VersionAnnotationBulkView.as_view(),
        name="version-annotations-bulk",
    ),
    path(
        "documents/<int:document_id>/comments/",
        DocumentCommentsView.as_view(),
        name="document-comments",
    ),
    path(
        "documents/<int:document_id>/collaboration/events/",
        CollaborationEventListView.as_view(),
        name="collaboration-events",
    ),
    path(
        "documents/<int:document_id>/collaboration/events/export/",
        CollaborationEventExportView.as_view(),
        name="collaboration-events-export",
    ),
]
