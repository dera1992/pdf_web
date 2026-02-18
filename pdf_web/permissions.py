from __future__ import annotations

from typing import Iterable

from django.core.exceptions import PermissionDenied

from pdf_web.documents.models import Workspace
from pdf_web.documents.models import WorkspaceMember
from pdf_web.documents.models import WorkspaceRole


ROLE_HIERARCHY = {
    WorkspaceRole.VIEWER: 1,
    WorkspaceRole.COMMENTER: 2,
    WorkspaceRole.EDITOR: 3,
    WorkspaceRole.ADMIN: 4,
    WorkspaceRole.OWNER: 5,
}


def get_workspace_role(user, workspace: Workspace) -> str | None:
    if not user or not user.is_authenticated:
        return None
    if workspace.owner_id == user.id:
        return WorkspaceRole.OWNER
    membership = WorkspaceMember.objects.filter(workspace=workspace, user=user).first()
    return membership.role if membership else None


def has_role(user, workspace: Workspace, allowed_roles: Iterable[str]) -> bool:
    role = get_workspace_role(user, workspace)
    if role is None:
        return False
    allowed = {r for r in allowed_roles}
    if not allowed or role not in ROLE_HIERARCHY:
        return False
    return ROLE_HIERARCHY[role] >= min(ROLE_HIERARCHY[r] for r in allowed)


def require_role(user, workspace: Workspace, allowed_roles: Iterable[str]) -> None:
    if not has_role(user, workspace, allowed_roles):
        raise PermissionDenied("Insufficient workspace permissions.")
