from django.conf import settings
from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework.routers import SimpleRouter

from pdf_web.users.api.views import UserViewSet

router = DefaultRouter() if settings.DEBUG else SimpleRouter()

router.register("users", UserViewSet)


urlpatterns = [
    # Include router-generated URLs (for ViewSets)
    *router.urls,
    # Add manual routes for generic views
    path("", include("pdf_web.pdfeditor.urls")),
]
