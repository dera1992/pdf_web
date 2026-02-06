from django.conf import settings
from django.contrib.postgres.operations import CreateExtension
from django.db import migrations
from django.db import models
import django.db.models.deletion
from django.utils import timezone
import pgvector.django


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("documents", "0001_initial"),
    ]

    operations = [
        CreateExtension("vector"),
        migrations.CreateModel(
            name="OcrJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pending", "Pending"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed")], default="pending", max_length=16)),
                ("language", models.CharField(default="eng", max_length=32)),
                ("created_at", models.DateTimeField(default=timezone.now)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                (
                    "output_version",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="ocr_output_jobs",
                        to="documents.documentversion",
                    ),
                ),
                (
                    "version",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ocr_jobs",
                        to="documents.documentversion",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ChatSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(default=timezone.now)),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chat_sessions",
                        to="documents.document",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="chat_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="EmbeddingChunk",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("page_number", models.PositiveIntegerField(default=1)),
                ("chunk_index", models.PositiveIntegerField(default=0)),
                ("text", models.TextField()),
                ("embedding", pgvector.django.VectorField(dimensions=1536)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "version",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="embedding_chunks",
                        to="documents.documentversion",
                    ),
                ),
            ],
            options={"unique_together": {("version", "page_number", "chunk_index")}},
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(max_length=16)),
                ("content", models.TextField()),
                ("created_at", models.DateTimeField(default=timezone.now)),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="ai.chatsession",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="RedactionSuggestion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("page_number", models.PositiveIntegerField()),
                ("quads", models.JSONField(blank=True, default=dict)),
                ("label", models.CharField(max_length=64)),
                ("confidence", models.FloatField(default=0.0)),
                ("text_snippet", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("accepted", "Accepted"), ("rejected", "Rejected"), ("applied", "Applied")], default="pending", max_length=16)),
                (
                    "version",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="redaction_suggestions",
                        to="documents.documentversion",
                    ),
                ),
            ],
            options={"ordering": ["page_number"]},
        ),
    ]
