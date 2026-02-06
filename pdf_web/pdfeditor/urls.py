from django.urls import path

from pdf_web.pdfeditor.api import views

app_name = "pdfeditor"
urlpatterns = [
    path("upload/", views.upload_pdf, name="upload_pdf"),
    path("document/<int:pk>/", views.get_document, name="get_document"),
    path("document/<int:pk>/save/", views.save_elements, name="save_elements"),
]
