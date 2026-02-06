from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from pdf_web.pdfeditor.models import Document

from .utils import extract_layout


@csrf_exempt  # for dev ONLY – better to handle CSRF properly later
@api_view(["POST"])
@permission_classes([AllowAny])
def upload_pdf(request):
    file = request.FILES.get("file")
    if not file:
        return Response(
            {"error": "No file uploaded"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    doc = Document.objects.create(file=file)
    # Extract layout
    layout = extract_layout(doc.file.path)
    # Store raw text if you want (concat all text)
    # Extract plain text
    text = "\n".join(
        el["text"] for page in layout for el in page["elements"] if el["type"] == "text"
    )

    doc.text = text
    doc.layout = layout  # <── THE IMPORTANT FIX
    doc.save()
    return Response({"id": doc.id}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def get_document(request, pk):
    try:
        doc = Document.objects.get(pk=pk)
    except Document.DoesNotExist:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(
        {
            "id": doc.id,
            "file_url": doc.file.url,
            "layout": doc.layout,  # <── IMPORTANT
            "text": doc.text,
        },
    )


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def save_elements(request, pk):
    try:
        doc = Document.objects.get(pk=pk)
    except Document.DoesNotExist:
        return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    elements = request.data.get("elements")
    if not isinstance(elements, list):
        return Response(
            {"error": "Invalid elements"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    doc.elements = elements
    doc.save()
    return Response({"status": "ok"})
