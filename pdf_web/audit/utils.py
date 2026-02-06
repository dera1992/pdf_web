from __future__ import annotations

from typing import Any

from pdf_web.audit.models import AuditLog
from pdf_web.documents.models import Workspace


def log_audit_event(
    *,
    request,
    workspace: Workspace,
    action: str,
    entity_type: str,
    entity_id: str | int,
    metadata: dict[str, Any] | None = None,
) -> None:
    meta = metadata or {}
    ip = getattr(request, "client_ip", None)
    user_agent = getattr(request, "user_agent", "")
    AuditLog.objects.create(
        workspace=workspace,
        user=request.user if request.user.is_authenticated else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        metadata=meta,
        ip=ip,
        user_agent=user_agent,
    )
