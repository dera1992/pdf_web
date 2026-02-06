from django.db.models.signals import post_save
from django.dispatch import receiver

from pdf_web.users.models import Profile
from pdf_web.users.models import User


@receiver(post_save, sender=User)
def create_profile(sender, instance: User, created: bool, **kwargs) -> None:
    if created:
        Profile.objects.get_or_create(user=instance)
