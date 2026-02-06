from rest_framework import serializers

from pdf_web.pdfeditor.models import Document


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ["id", "file", "uploaded_at", "extracted_text", "elements"]
