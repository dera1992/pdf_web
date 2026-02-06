Backend Blueprint
======================================================================

Overview
----------------------------------------------------------------------
The backend is built on **Django** with **Django REST Framework (DRF)**,
providing secure APIs for document management, collaboration, and AI-powered
PDF tooling. The system is designed for multi-tenant, role-based access with
asynchronous processing for heavy PDF tasks (OCR, rendering, AI summaries).

High-Level Architecture
----------------------------------------------------------------------
- **API Layer (DRF)**
  - REST endpoints for document upload, rendering, annotations, and AI features.
  - JWT authentication with role-based access control (admin, editor, viewer).
- **Core Services**
  - Document ingestion, metadata extraction, page rendering, and search index.
  - Annotation service with versioning and audit trails.
  - Collaboration service for real-time presence and shared editing.
- **Async Processing**
  - Celery workers handle OCR, embedding, smart redaction, and rendering jobs.
- **Storage**
  - Original PDFs, extracted text, and page images stored in object storage
    (local or S3), referenced by database records.
- **Real-Time Collaboration**
  - WebSocket layer (Django Channels) for real-time presence, comments, and
    collaborative annotation updates.

Core Models
----------------------------------------------------------------------
Document
  - **Purpose**: Store uploaded PDFs and extracted metadata.
  - **Key fields**:
    - ``file`` (original PDF)
    - ``title``
    - ``owner`` (User)
    - ``team`` / ``workspace`` (optional multi-tenant scope)
    - ``password_protected`` + ``password_hash``
    - ``permissions`` (print/copy/modify flags)
    - ``extracted_text``
    - ``layout_data`` (JSON layout for annotations)
    - ``page_images`` (references to rendered page assets)
  - **Access**: governed by role and document-level ACLs.

DocumentVersion
  - **Purpose**: Track edits and collaborative changes over time.
  - **Key fields**:
    - ``document`` (FK)
    - ``created_by`` (User)
    - ``created_at``
    - ``diff_metadata`` / ``change_summary``

Annotation
  - **Purpose**: Store annotations and markup tied to a document page.
  - **Key fields**:
    - ``document`` (FK)
    - ``version`` (FK)
    - ``page_number``
    - ``type`` (highlight, text, shape, stamp, signature)
    - ``content`` (text or payload)
    - ``geometry`` (JSON bounding box/points)
    - ``created_by`` (User)
    - ``updated_at``

Comment / Thread
  - **Purpose**: Collaboration and discussion around annotations or pages.
  - **Key fields**:
    - ``document`` (FK)
    - ``annotation`` (optional FK)
    - ``author`` (User)
    - ``body``
    - ``created_at``

AuditLog
  - **Purpose**: Capture compliance and history for sensitive documents.
  - **Key fields**:
    - ``document`` (FK)
    - ``actor`` (User)
    - ``action`` (created/updated/shared/permission-changed)
    - ``timestamp``
    - ``metadata`` (JSON)

User
  - **Purpose**: Authentication, authorization, and collaboration features.
  - **Key fields**:
    - ``email``
    - ``role`` (admin, editor, viewer)
    - ``teams`` / ``workspaces``
    - ``is_active``

API Endpoints (Illustrative)
----------------------------------------------------------------------
Authentication & Users
  - ``POST /api/auth/register/``
  - ``POST /api/auth/login/``
  - ``GET /api/users/me/``

Documents
  - ``POST /api/documents/`` (upload PDF)
  - ``GET /api/documents/`` (list accessible docs)
  - ``GET /api/documents/{id}/`` (metadata + permissions)
  - ``POST /api/documents/{id}/share/``

Document Versions & Rendering
  - ``GET /api/documents/{id}/versions/``
  - ``GET /api/versions/{id}/pages/`` (page images)
  - ``GET /api/versions/{id}/toc/``

Search & Extraction
  - ``GET /api/versions/{id}/search/?q=``
  - ``POST /api/versions/{id}/extract/``

Annotations & Collaboration
  - ``GET /api/versions/{id}/annotations/``
  - ``POST /api/versions/{id}/annotations/``
  - ``PATCH /api/annotations/{id}/``
  - ``DELETE /api/annotations/{id}/``
  - ``WS /ws/documents/{id}/`` (realtime updates)

AI & OCR (Optional)
  - ``POST /api/versions/{id}/ocr/``
  - ``POST /api/versions/{id}/summarize/``
  - ``POST /api/versions/{id}/redact/``

Security & Permissions
----------------------------------------------------------------------
- **JWT auth** for API access with refresh/rotation.
- **Role-based access control** for document actions.
- **Document-level permissions** (print/copy/modify) enforced server-side.
- **Audit logging** for compliance and security review.

Operational Considerations
----------------------------------------------------------------------
- **Background jobs**: rendering, OCR, AI summarization, and redaction.
- **Caching**: page previews and search results cached for performance.
- **Storage**: local filesystem for development, S3 for production.
- **Observability**: structured logging + monitoring for long-running tasks.
