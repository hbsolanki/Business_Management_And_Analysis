import logging

from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver

from apps.user.models import User

logger = logging.getLogger(__name__)


def _delete_s3_file(file_name: str) -> None:
    """Delete a file from the configured storage backend (S3 or local)."""
    if not file_name:
        return
    try:
        from django.core.files.storage import default_storage
        if default_storage.exists(file_name):
            default_storage.delete(file_name)
    except Exception as exc:
        logger.warning("Failed to delete profile picture '%s': %s", file_name, exc)


@receiver(pre_save, sender=User)
def auto_delete_old_profile(sender, instance, **kwargs):
    """Delete the old profile picture from storage when a new one is uploaded."""
    if not instance.pk:
        return
    try:
        old = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    if old.profile_picture and old.profile_picture != instance.profile_picture:
        _delete_s3_file(old.profile_picture.name)


@receiver(post_delete, sender=User)
def delete_profile_on_user_delete(sender, instance, **kwargs):
    """Delete the profile picture from storage when a user is hard-deleted."""
    if instance.profile_picture:
        _delete_s3_file(instance.profile_picture.name)
