from __future__ import annotations

from urllib.parse import parse_qs

from asgiref.sync import sync_to_async
from channels.auth import AuthMiddlewareStack
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.tokens import TokenError

User = get_user_model()


@sync_to_async
def _get_user_from_token(token: str):
    try:
        payload = AccessToken(token)
    except TokenError:
        return AnonymousUser()

    user_id = payload.get("user_id")
    if not user_id:
        return AnonymousUser()

    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()


class JwtQueryAuthMiddleware:
    """Authenticate websocket connections using JWT passed in query string.

    Supports `?token=<access>` and `?access_token=<access>` so JWT-only frontend
    sessions can authenticate when no Django session cookie is present.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get("query_string", b"").decode("utf-8"))
        token = (query.get("token") or query.get("access_token") or [None])[0]

        if token and (not scope.get("user") or scope["user"].is_anonymous):
            scope["user"] = await _get_user_from_token(token)

        return await self.app(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    return JwtQueryAuthMiddleware(AuthMiddlewareStack(inner))
