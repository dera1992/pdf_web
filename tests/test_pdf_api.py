from io import BytesIO
import zipfile
import pytest
from PIL import Image
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




def make_jpg_file(name="sample.jpg"):
    buf = BytesIO()
    Image.new("RGB", (200, 100), color=(52, 120, 220)).save(buf, format="JPEG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


def make_ooxml_file(name: str, files: dict[str, str], content_type: str):
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, mode="w") as archive:
        archive.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>')
        for path, xml in files.items():
            archive.writestr(path, xml)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=content_type)


def make_docx_file(name="sample.docx"):
    return make_ooxml_file(
        name,
        {"word/document.xml": "<w:document><w:body><w:p><w:t>Hello DOCX content</w:t></w:p></w:body></w:document>"},
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


def make_xlsx_file(name="sample.xlsx"):
    return make_ooxml_file(
        name,
        {
            "xl/sharedStrings.xml": "<sst><si><t>Revenue</t></si><si><t>Quarterly Sheet</t></si></sst>",
            "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row><c t="s"><v>0</v></c><c t="s"><v>1</v></c></row></sheetData></worksheet>',
        },
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


def make_pptx_file(name="sample.pptx"):
    return make_ooxml_file(
        name,
        {"ppt/slides/slide1.xml": "<p:sld><p:cSld><p:spTree><a:t>Pitch Deck Slide</a:t></p:spTree></p:cSld></p:sld>"},
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )
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
        layout_json={"1": [{"bbox": [0, 0, 10, 10], "text": "Hello", "block_type": 0}]},
        pdf_info={"page_count": 1},
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
def test_documents_list_can_be_filtered_by_workspace(api_client, user):
    workspace_a = Workspace.objects.create(name="A", owner=user)
    workspace_b = Workspace.objects.create(name="B", owner=user)
    WorkspaceMember.objects.create(workspace=workspace_a, user=user, role=WorkspaceRole.OWNER)
    WorkspaceMember.objects.create(workspace=workspace_b, user=user, role=WorkspaceRole.OWNER)
    create_document(workspace_a, user)
    create_document(workspace_b, user)

    api_client.force_authenticate(user=user)
    response = api_client.get(f"/api/documents/?workspace={workspace_a.id}")

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["workspace"] == workspace_a.id


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


@pytest.mark.django_db
def test_workspace_membership_and_permissions(api_client, user, workspace):
    api_client.force_authenticate(user=user)
    response = api_client.get("/api/workspaces/")
    assert response.status_code == 200
    assert response.data

    response = api_client.post(
        "/api/workspace-members/",
        {"workspace": workspace.id, "user": user.id, "role": WorkspaceRole.OWNER},
        format="json",
    )
    assert response.status_code in {200, 201, 400}


@pytest.mark.django_db
def test_version_layout_and_permissions_endpoints(api_client, user, workspace):
    document, version = create_document(workspace, user)
    api_client.force_authenticate(user=user)
    response = api_client.get(f"/api/versions/{version.id}/layout/?page=1")
    assert response.status_code == 200
    assert response.data["layout"]

    response = api_client.get(f"/api/versions/{version.id}/permissions/")
    assert response.status_code == 200

    response = api_client.post(
        f"/api/versions/{version.id}/permissions/",
        {"security_state": {"allow_print": False}},
        format="json",
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_operations_watermark_and_encrypt(api_client, user, workspace):
    document, version = create_document(workspace, user)
    api_client.force_authenticate(user=user)
    response = api_client.post(
        f"/api/versions/{version.id}/watermark/",
        {"text": "CONFIDENTIAL"},
        format="json",
    )
    assert response.status_code == 200
    response = api_client.post(
        f"/api/versions/{version.id}/encrypt/",
        {"owner_password": "secret"},
        format="json",
    )
    assert response.status_code == 200


@pytest.mark.django_db
def test_chat_and_redactions(api_client, user, workspace):
    document, version = create_document(workspace, user)
    api_client.force_authenticate(user=user)
    response = api_client.post(f"/api/documents/{document.id}/chat/", format="json")
    assert response.status_code == 200
    session_id = response.data["id"]

    response = api_client.post(
        f"/api/chat/{session_id}/message/",
        {"content": "Summarize"},
        format="json",
    )
    assert response.status_code == 201

    response = api_client.post(f"/api/versions/{version.id}/redaction/suggest/", format="json")
    assert response.status_code == 200


@pytest.mark.django_db
def test_audit_list_filters(api_client, user, workspace):
    document, version = create_document(workspace, user)
    api_client.force_authenticate(user=user)
    api_client.get(f"/api/versions/{version.id}/download/")
    response = api_client.get(f"/api/audit/?document_id={document.id}&action=document.download")
    assert response.status_code == 200
    assert response.data


@pytest.mark.django_db
def test_new_pdf_tool_endpoints_and_share(api_client, user, workspace):
    document, version = create_document(workspace, user)
    api_client.force_authenticate(user=user)

    response = api_client.post(
        f"/api/versions/{version.id}/edit-text/",
        {"text_content": "Updated", "layout_json": {"1": [{"text": "Updated"}]}} ,
        format="json",
    )
    assert response.status_code == 201

    response = api_client.post(f"/api/versions/{version.id}/number-pages/", {"start_number": 1}, format="json")
    assert response.status_code == 200
    assert "id" in response.data

    response = api_client.post(
        f"/api/versions/{version.id}/share/",
        {"expires_in_hours": 24, "password": "s3cret"},
        format="json",
    )
    assert response.status_code == 201
    assert response.data["token"]


@pytest.mark.django_db
def test_conversion_endpoints_return_async_contract(api_client, user, workspace):
    document, version = create_document(workspace, user)
    api_client.force_authenticate(user=user)

    response = api_client.post(f"/api/versions/{version.id}/convert/word/", {}, format="json")
    assert response.status_code == 200
    assert {"id", "status", "progress", "result_url"}.issubset(set(response.data.keys()))

    payload = {"workspace": workspace.id, "file": make_pdf_file("from-doc.pdf")}
    response = api_client.post("/api/convert/word-to-pdf/", payload, format="multipart")
    assert response.status_code == 202
    assert {"id", "status", "progress", "result_url"}.issubset(set(response.data.keys()))


@pytest.mark.django_db
def test_guest_convert_to_pdf_supports_preview(api_client):
    response = api_client.post(
        "/api/convert/word-to-pdf/",
        {"file": make_pdf_file("guest-input.docx")},
        format="multipart",
    )
    assert response.status_code == 202
    assert "result_url" in response.data
    assert "preview_url" in response.data


@pytest.mark.django_db
def test_guest_pdf_to_ppt_conversion_upload_contract(api_client):
    response = api_client.post(
        "/api/convert/pdf-to-ppt/",
        {"file": make_pdf_file("guest-input.pdf")},
        format="multipart",
    )
    assert response.status_code == 202
    assert {"id", "status", "progress", "result_url", "preview_url"}.issubset(set(response.data.keys()))
    assert str(response.data["result_url"]).lower().endswith(".pptx")


@pytest.mark.django_db
def test_guest_pdf_to_word_conversion_contains_text_fallback(api_client, monkeypatch):
    from pdf_web.operations import services
    from pdf_web.operations.models import ConversionJob

    monkeypatch.setattr(services, "_convert_pdf_with_libreoffice", lambda *_args, **_kwargs: None)

    response = api_client.post(
        "/api/convert/pdf-to-word/",
        {"file": make_pdf_file("guest-input.pdf")},
        format="multipart",
    )
    assert response.status_code == 202

    job = ConversionJob.objects.get(id=response.data["id"])
    with job.result_version.file.open("rb") as handle:
        output = handle.read()
    with zipfile.ZipFile(BytesIO(output)) as archive:
        doc_xml = archive.read("word/document.xml")
    assert b"Hello" in doc_xml


@pytest.mark.django_db
def test_guest_pdf_to_excel_conversion_contains_text_fallback(api_client, monkeypatch):
    from pdf_web.operations import services
    from pdf_web.operations.models import ConversionJob

    monkeypatch.setattr(services, "_convert_pdf_with_libreoffice", lambda *_args, **_kwargs: None)

    response = api_client.post(
        "/api/convert/pdf-to-excel/",
        {"file": make_pdf_file("guest-input.pdf")},
        format="multipart",
    )
    assert response.status_code == 202

    job = ConversionJob.objects.get(id=response.data["id"])
    with job.result_version.file.open("rb") as handle:
        output = handle.read()
    with zipfile.ZipFile(BytesIO(output)) as archive:
        strings_xml = archive.read("xl/sharedStrings.xml")
    assert b"Hello" in strings_xml


@pytest.mark.django_db
def test_guest_pdf_to_ppt_conversion_contains_text_fallback(api_client, monkeypatch):
    from pdf_web.operations import services
    from pdf_web.operations.models import ConversionJob

    monkeypatch.setattr(services, "_convert_pdf_with_libreoffice", lambda *_args, **_kwargs: None)

    response = api_client.post(
        "/api/convert/pdf-to-ppt/",
        {"file": make_pdf_file("guest-input.pdf")},
        format="multipart",
    )
    assert response.status_code == 202

    job = ConversionJob.objects.get(id=response.data["id"])
    with job.result_version.file.open("rb") as handle:
        output = handle.read()
    with zipfile.ZipFile(BytesIO(output)) as archive:
        slide_xml = archive.read("ppt/slides/slide1.xml")
    assert b"Hello" in slide_xml


@pytest.mark.django_db
def test_guest_pdf_to_jpg_conversion_renders_first_page(api_client):
    response = api_client.post(
        "/api/convert/pdf-to-jpg/",
        {"file": make_pdf_file("guest-input.pdf")},
        format="multipart",
    )
    assert response.status_code == 202
    from pdf_web.operations.models import ConversionJob

    job = ConversionJob.objects.get(id=response.data["id"])
    with job.result_version.file.open("rb") as handle:
        output = handle.read()
    assert output.startswith(b"\xff\xd8\xff")
    assert len(output) > 500


@pytest.mark.django_db
def test_guest_excel_to_pdf_conversion_upload_contract(api_client):
    response = api_client.post(
        "/api/convert/excel-to-pdf/",
        {"file": make_pdf_file("guest-input.xlsx")},
        format="multipart",
    )
    assert response.status_code == 202
    assert {"id", "status", "progress", "result_url", "preview_url"}.issubset(set(response.data.keys()))
    assert str(response.data["result_url"]).lower().endswith(".pdf")
    assert str(response.data["preview_url"]).lower().endswith(".pdf")


@pytest.mark.django_db
def test_guest_jpg_to_pdf_generates_real_pdf(api_client):
    response = api_client.post(
        "/api/convert/jpg-to-pdf/",
        {"file": make_jpg_file("chart.jpg")},
        format="multipart",
    )
    assert response.status_code == 202
    from pdf_web.operations.models import ConversionJob

    job = ConversionJob.objects.get(id=response.data["id"])
    assert str(job.result_version.file.name).lower().endswith(".pdf")
    with job.result_version.file.open("rb") as handle:
        assert handle.read(4) == b"%PDF"


@pytest.mark.django_db
def test_guest_docx_to_pdf_contains_extracted_text(api_client):
    response = api_client.post("/api/convert/word-to-pdf/", {"file": make_docx_file()}, format="multipart")
    assert response.status_code == 202
    from pdf_web.operations.models import ConversionJob

    job = ConversionJob.objects.get(id=response.data["id"])
    with job.result_version.file.open("rb") as handle:
        output = handle.read()
    assert output.startswith(b"%PDF")
    assert b"Hello DOCX content" in output


@pytest.mark.django_db
def test_guest_xlsx_to_pdf_contains_extracted_text(api_client):
    response = api_client.post("/api/convert/excel-to-pdf/", {"file": make_xlsx_file(), "allow_text_fallback": "true"}, format="multipart")
    assert response.status_code == 202
    from pdf_web.operations.models import ConversionJob

    job = ConversionJob.objects.get(id=response.data["id"])
    with job.result_version.file.open("rb") as handle:
        output = handle.read()
    assert output.startswith(b"%PDF")
    assert b"Revenue" in output


@pytest.mark.django_db
def test_guest_pptx_to_pdf_contains_extracted_text(api_client):
    response = api_client.post("/api/convert/ppt-to-pdf/", {"file": make_pptx_file()}, format="multipart")
    assert response.status_code == 202
    from pdf_web.operations.models import ConversionJob

    job = ConversionJob.objects.get(id=response.data["id"])
    with job.result_version.file.open("rb") as handle:
        output = handle.read()
    assert output.startswith(b"%PDF")
    assert b"Pitch Deck Slide" in output


@pytest.mark.django_db
def test_guest_xlsx_to_pdf_requires_high_fidelity_by_default(api_client, monkeypatch):
    from pdf_web.operations import services

    monkeypatch.setattr(services, "_convert_excel_with_libreoffice", lambda *_args, **_kwargs: None)

    response = api_client.post("/api/convert/excel-to-pdf/", {"file": make_xlsx_file()}, format="multipart")

    assert response.status_code == 202
    assert response.data["status"] == "failed"
    assert "High-fidelity Excel to PDF conversion is unavailable" in str(response.data.get("error"))
