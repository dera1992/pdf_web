from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="user",
            name="username",
        ),
        migrations.AlterField(
            model_name="user",
            name="email",
            field=models.EmailField(max_length=254, unique=True, verbose_name="email address"),
        ),
        migrations.CreateModel(
            name="Profile",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("full_name", models.CharField(blank=True, max_length=255)),
                ("phone_number", models.CharField(blank=True, max_length=32)),
                ("avatar", models.ImageField(blank=True, null=True, upload_to="avatars/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=models.deletion.CASCADE,
                        related_name="profile",
                        to="users.user",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
