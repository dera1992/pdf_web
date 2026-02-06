from django.conf import settings
from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework.routers import SimpleRouter

from pdf_web.annotations.api.views import AnnotationViewSet
from pdf_web.annotations.api.views import VersionAnnotationBulkView
from pdf_web.annotations.api.views import VersionAnnotationsView
from pdf_web.audit.api.views import AuditLogViewSet
from pdf_web.documents.api.views import DocumentVersionViewSet
from pdf_web.documents.api.views import DocumentViewSet
from pdf_web.documents.api.views import WorkspaceMemberViewSet
from pdf_web.documents.api.views import WorkspaceViewSet
from pdf_web.operations.api.views import ExportJobViewSet
from pdf_web.operations.api.views import OperationJobViewSet
from pdf_web.ai.api.views import ChatSessionViewSet
from pdf_web.ai.api.views import RedactionSuggestionViewSet
from pdf_web.users.api.views import UserViewSet

router = DefaultRouter() if settings.DEBUG else SimpleRouter()

router.register("users", UserViewSet)
router.register("workspaces", WorkspaceViewSet, basename="workspace")
router.register("workspace-members", WorkspaceMemberViewSet, basename="workspace-member")
router.register("documents", DocumentViewSet, basename="document")
router.register("versions", DocumentVersionViewSet, basename="version")
router.register("annotations", AnnotationViewSet, basename="annotation")
router.register("operations", OperationJobViewSet, basename="operation")
router.register("exports", ExportJobViewSet, basename="export")
router.register("chat", ChatSessionViewSet, basename="chat")
router.register("redactions", RedactionSuggestionViewSet, basename="redaction")
router.register("audit", AuditLogViewSet, basename="audit")


app_name = "api"
urlpatterns = router.urls + [
    path("versions/<int:version_id>/annotations/", VersionAnnotationsView.as_view()),
    path("versions/<int:version_id>/annotations/bulk/", VersionAnnotationBulkView.as_view()),
]
