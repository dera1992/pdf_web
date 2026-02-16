# PDF Tool Suite Implementation (Phased)

## Phase 1: Core View/Edit
Implemented endpoints for edit text, render page, search, page numbering, crop, redact, watermark, fill form, and share link creation on `DocumentVersionViewSet`.

## Phase 2: Conversion
Implemented async `ConversionJob` model and Celery-backed processing for:
- PDF to Word/Excel/PPT/JPG
- Word/Excel/PPT/JPG to PDF

All async endpoints return:

```json
{
  "job_id": 123,
  "status": "pending",
  "progress": 0,
  "result_url": null
}
```

## Phase 3: OCR
Existing OCR endpoint is retained and queued through Celery.

## Backend Architecture Notes
- Added service layer in `pdf_web/operations/services.py` for version cloning and share-link creation.
- Added typed async job serializers with result URL support.
- Added conversion endpoint throttling (`conversion` scope).
- Added upload validation guardrails for PDF MIME type and max file size.

## Frontend Integration
Use `frontend/src/api/pdfTools.ts` for all tool endpoints and async job contracts.

## Security and Tenancy
- Workspace membership checks enforced using role guards.
- Conversion endpoints use scoped DRF throttling.
- Audit logging remains in place for existing endpoints and is compatible with new flow.
