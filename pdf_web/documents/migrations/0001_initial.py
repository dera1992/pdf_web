from django.conf import settings
from django.db import migrations
from django.db import models
import django.db.models.deletion
import pdf_web.documents.models
from django.utils import timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Workspace",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(default=timezone.now)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="owned_workspaces",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="Document",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(default=timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("active", "Active"), ("archived", "Archived"), ("processing", "Processing"), ("error", "Error")], default="processing", max_length=16)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_documents",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to="documents.workspace",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="DocumentVersion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("version_number", models.PositiveIntegerField()),
                ("file", models.FileField(upload_to=pdf_web.documents.models.document_upload_path)),
                ("file_hash", models.CharField(blank=True, max_length=128)),
                ("size_bytes", models.BigIntegerField(default=0)),
                ("created_at", models.DateTimeField(default=timezone.now)),
                ("processing_state", models.JSONField(blank=True, default=dict)),
                ("pdf_info", models.JSONField(blank=True, default=dict)),
                ("text_content", models.TextField(blank=True)),
                ("layout_json", models.JSONField(blank=True, default=dict)),
                ("security_state", models.JSONField(blank=True, default=dict)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_versions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="versions",
                        to="documents.document",
                    ),
                ),
            ],
            options={
                "ordering": ["-version_number"],
                "unique_together": {("document", "version_number")},
            },
        ),
        migrations.CreateModel(
            name="DocumentPageAsset",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("page_number", models.PositiveIntegerField()),
                ("thumb_image", models.ImageField(blank=True, upload_to=pdf_web.documents.models.asset_upload_path)),
                ("preview_image", models.ImageField(blank=True, upload_to=pdf_web.documents.models.asset_upload_path)),
                ("width", models.PositiveIntegerField(default=0)),
                ("height", models.PositiveIntegerField(default=0)),
                ("dpi", models.PositiveIntegerField(default=72)),
                ("content_hash", models.CharField(blank=True, max_length=128)),
                (
                    "version",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="page_assets",
                        to="documents.documentversion",
                    ),
                ),
            ],
            options={
                "ordering": ["page_number", "dpi"],
                "unique_together": {("version", "page_number", "dpi")},
            },
        ),
        migrations.CreateModel(
            name="DocumentBookmark",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("page_number", models.PositiveIntegerField()),
                ("tree", models.JSONField(blank=True, default=dict)),
                (
                    "version",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="bookmarks",
                        to="documents.documentversion",
                    ),
                ),
            ],
            options={"ordering": ["page_number"]},
        ),
        migrations.CreateModel(
            name="WorkspaceMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("owner", "Owner"), ("admin", "Admin"), ("editor", "Editor"), ("viewer", "Viewer")], max_length=16)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workspace_memberships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="memberships",
                        to="documents.workspace",
                    ),
                ),
            ],
            options={"unique_together": {("workspace", "user")}},
        ),
        migrations.AddField(
            model_name="document",
            name="current_version",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="current_for_documents",
                to="documents.documentversion",
            ),
        ),
    ]
