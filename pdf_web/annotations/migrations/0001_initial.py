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
            name="Annotation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("page_number", models.PositiveIntegerField()),
                ("type", models.CharField(choices=[("highlight", "Highlight"), ("underline", "Underline"), ("strikethrough", "Strikethrough"), ("ink", "Ink"), ("note", "Sticky Note"), ("shape", "Shape"), ("stamp", "Stamp"), ("form", "Form"), ("signature", "Signature"), ("text_edit", "Text Edit"), ("image", "Image")], max_length=32)),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(default=timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="annotations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="annotations",
                        to="documents.document",
                    ),
                ),
                (
                    "version",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="annotations",
                        to="documents.documentversion",
                    ),
                ),
            ],
            options={"ordering": ["page_number", "created_at"]},
        ),
        migrations.CreateModel(
            name="CollabEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(max_length=64)),
                ("event", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(default=timezone.now)),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="collab_events",
                        to="documents.document",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="collab_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="PresenceSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("connection_id", models.CharField(max_length=128)),
                ("joined_at", models.DateTimeField(default=timezone.now)),
                ("last_seen_at", models.DateTimeField(default=timezone.now)),
                (
                    "document",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="presence_sessions",
                        to="documents.document",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="presence_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"unique_together": {("document", "connection_id")}},
        ),
        migrations.CreateModel(
            name="AnnotationRevision",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("revision_number", models.PositiveIntegerField()),
                ("payload", models.JSONField(blank=True, default=dict)),
                ("changed_at", models.DateTimeField(default=timezone.now)),
                (
                    "annotation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="revisions",
                        to="annotations.annotation",
                    ),
                ),
                (
                    "changed_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="annotation_revisions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["revision_number"],
                "unique_together": {("annotation", "revision_number")},
            },
        ),
    ]
