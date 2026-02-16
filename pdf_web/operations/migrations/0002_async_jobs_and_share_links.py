# Generated manually by Codex.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("operations", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ConversionJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=16)),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("params", models.JSONField(blank=True, default=dict)),
                ("error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("target_format", models.CharField(max_length=16)),
                ("source_mime_type", models.CharField(blank=True, max_length=128)),
                ("document", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.document")),
                ("requested_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("result_version", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="conversionjob_results", to="documents.documentversion")),
                ("version", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.documentversion")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.workspace")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="CropJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=16)),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("params", models.JSONField(blank=True, default=dict)),
                ("error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("document", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.document")),
                ("requested_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("result_version", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cropjob_results", to="documents.documentversion")),
                ("version", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.documentversion")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.workspace")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="PageNumberJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=16)),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("params", models.JSONField(blank=True, default=dict)),
                ("error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("document", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.document")),
                ("requested_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("result_version", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="pagenumberjob_results", to="documents.documentversion")),
                ("version", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.documentversion")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.workspace")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ShareLink",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("token", models.CharField(max_length=128, unique=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("password_hash", models.CharField(blank=True, max_length=256)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("document", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="share_links", to="documents.document")),
                ("version", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="share_links", to="documents.documentversion")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="share_links", to="documents.workspace")),
            ],
        ),
        migrations.CreateModel(
            name="WatermarkJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=16)),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("params", models.JSONField(blank=True, default=dict)),
                ("error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("document", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.document")),
                ("requested_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("result_version", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="watermarkjob_results", to="documents.documentversion")),
                ("version", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.documentversion")),
                ("workspace", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="documents.workspace")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
