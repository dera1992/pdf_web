import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from pdf_web.annotations.models import Annotation
from pdf_web.audit.models import AuditLog
from pdf_web.documents.models import Document
from pdf_web.documents.models import DocumentVersion
from pdf_web.documents.models import Workspace
from pdf_web.documents.models import WorkspaceMember
from pdf_web.documents.models import WorkspaceRole
from pdf_web.operations.models import OperationJob


@pytest.fixture
def api_client():
    return APIClient()


def make_pdf_file(name="sample.pdf"):
    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 72 72 Td (Hello) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000061 00000 n\n0000000118 00000 n\n0000000219 00000 n\ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n300\n%%EOF"
    return SimpleUploadedFile(name, pdf_bytes, content_type="application/pdf")


@pytest.fixture
def workspace(user):
    workspace = Workspace.objects.create(name="Acme", owner=user)
    WorkspaceMember.objects.create(workspace=workspace, user=user, role=WorkspaceRole.OWNER)
    return workspace


@pytest.fixture
def editor(user, db):
    from pdf_web.users.tests.factories import UserFactory

    editor = UserFactory()
    return editor


@pytest.fixture
def viewer(user, db):
    from pdf_web.users.tests.factories import UserFactory

    viewer = UserFactory()
    return viewer


def create_document(workspace, user):
    document = Document.objects.create(workspace=workspace, title="Sample", created_by=user)
    version = DocumentVersion.objects.create(
        document=document,
        version_number=1,
        file=make_pdf_file(),
        created_by=user,
        text_content="Hello World",
    )
    document.current_version = version
    document.save(update_fields=["current_version"])
    return document, version


@pytest.mark.django_db
def test_upload_creates_document_and_version(api_client, user, workspace):
    api_client.force_authenticate(user=user)
    response = api_client.post(
        "/api/documents/",
        {"workspace": workspace.id, "title": "Upload", "file": make_pdf_file()},
        format="multipart",
    )
    assert response.status_code == 201
    assert Document.objects.count() == 1
    assert DocumentVersion.objects.count() == 1


@pytest.mark.django_db
def test_permissions_for_annotations_and_encrypt(api_client, user, editor, viewer, workspace):
    WorkspaceMember.objects.create(workspace=workspace, user=editor, role=WorkspaceRole.EDITOR)
    WorkspaceMember.objects.create(workspace=workspace, user=viewer, role=WorkspaceRole.VIEWER)
    document, version = create_document(workspace, user)

    api_client.force_authenticate(user=viewer)
    response = api_client.post(
        f"/api/versions/{version.id}/annotations/",
        {"page_number": 1, "type": "note", "payload": {"text": "Hi"}},
        format="json",
    )
    assert response.status_code == 403

    api_client.force_authenticate(user=editor)
    response = api_client.post(
        f"/api/versions/{version.id}/annotations/",
        {"page_number": 1, "type": "note", "payload": {"text": "Hi"}},
        format="json",
    )
    assert response.status_code == 201

    api_client.force_authenticate(user=editor)
    response = api_client.post(
        f"/api/versions/{version.id}/encrypt/",
        {"owner_password": "secret"},
        format="json",
    )
    assert response.status_code == 403

    api_client.force_authenticate(user=user)
    response = api_client.post(
        f"/api/versions/{version.id}/encrypt/",
        {"owner_password": "secret"},
        format="json",
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_operation_job_merge_creates_output(api_client, user, workspace):
    document, version = create_document(workspace, user)
    api_client.force_authenticate(user=user)
    response = api_client.post(
        "/api/operations/merge/",
        {"workspace": workspace.id, "version_ids": [version.id]},
        format="json",
    )
    assert response.status_code == 201
    job_id = response.data["id"]
    job = OperationJob.objects.get(id=job_id)
    assert job.output_version is not None


@pytest.mark.django_db
def test_annotation_crud_and_bulk(api_client, user, workspace):
    document, version = create_document(workspace, user)
    api_client.force_authenticate(user=user)
    response = api_client.post(
        f"/api/versions/{version.id}/annotations/",
        {"page_number": 1, "type": "note", "payload": {"text": "Hi"}},
        format="json",
    )
    assert response.status_code == 201
    annotation_id = response.data["id"]

    response = api_client.patch(
        f"/api/annotations/{annotation_id}/",
        {"payload": {"text": "Updated"}},
        format="json",
    )
    assert response.status_code == 200

    response = api_client.post(
        f"/api/versions/{version.id}/annotations/bulk/",
        {"items": [{"page_number": 1, "type": "note", "payload": {"text": "Bulk"}}]},
        format="json",
    )
    assert response.status_code == 201

    response = api_client.delete(f"/api/annotations/{annotation_id}/")
    assert response.status_code == 204
    assert Annotation.objects.filter(id=annotation_id, is_deleted=True).exists()


@pytest.mark.django_db
def test_search_and_audit_log(api_client, user, workspace):
    document, version = create_document(workspace, user)
    api_client.force_authenticate(user=user)
    response = api_client.get(f"/api/versions/{version.id}/search/?q=Hello&highlight_all=1")
    assert response.status_code == 200
    assert response.data["results"]

    response = api_client.get(f"/api/versions/{version.id}/download/")
    assert response.status_code == 200
    assert AuditLog.objects.filter(action="document.download").exists()
