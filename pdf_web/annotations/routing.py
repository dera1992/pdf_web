from django.urls import re_path

from pdf_web.annotations.consumers import DocumentCollaborationConsumer

websocket_urlpatterns = [
    re_path(r"^/?ws/documents/(?P<document_id>\d+)/$", DocumentCollaborationConsumer.as_asgi()),
    re_path(r"^/?api/ws/documents/(?P<document_id>\d+)/$", DocumentCollaborationConsumer.as_asgi()),
]
