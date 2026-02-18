from django.db import migrations
from django.db import models


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="workspacemember",
            name="role",
            field=models.CharField(
                choices=[
                    ("owner", "Owner"),
                    ("admin", "Admin"),
                    ("editor", "Editor"),
                    ("commenter", "Commenter"),
                    ("viewer", "Viewer"),
                ],
                max_length=16,
            ),
        ),
    ]
