from django.conf import settings
from django.db import migrations
from django.db import models
import django.db.models.deletion
from django.utils import timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("documents", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="OperationJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(default=timezone.now)),
                ("type", models.CharField(choices=[("merge", "Merge"), ("split", "Split"), ("reorder", "Reorder"), ("rotate", "Rotate"), ("delete_pages", "Delete Pages"), ("compress", "Compress"), ("flatten", "Flatten"), ("export", "Export"), ("watermark", "Watermark"), ("encrypt", "Encrypt"), ("redact", "Redact")], max_length=32)),
                ("params", models.JSONField(blank=True, default=dict)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=16)),
                ("log", models.TextField(blank=True)),
                ("error", models.TextField(blank=True)),
                (
                    "output_version",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="output_jobs",
                        to="documents.documentversion",
                    ),
                ),
                (
                    "requested_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="operation_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="operation_jobs",
                        to="documents.workspace",
                    ),
                ),
                (
                    "input_versions",
                    models.ManyToManyField(related_name="operation_jobs", to="documents.documentversion"),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
