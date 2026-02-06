from django.db import models


class Document(models.Model):
    file = models.FileField(upload_to="documents/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    text = models.TextField(null=True, blank=True)
    processed = models.BooleanField(default=False)
    # For AI and editor model
    layout = models.JSONField(null=True, blank=True)

    # For PDF.js backgrounds
    page_images = models.JSONField(null=True, blank=True)

    def __str__(self):
        return self.file.name
