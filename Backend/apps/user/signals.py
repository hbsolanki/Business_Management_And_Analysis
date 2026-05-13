import boto3
import logging
from django.conf import settings
from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from apps.user.models import User

logger = logging.getLogger(__name__)


def delete_s3_file(file_key):
    """
    Delete a file from S3 by its storage key.
    """
    if not file_key:
        return
    try:
        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
        )
        s3.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=file_key)
    except Exception as e:
        logger.warning(f"[S3] Failed to delete profile picture {file_key}: {e}")


# Delete old image when user updates profile picture
@receiver(pre_save, sender=User)
def auto_delete_old_profile(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    if old.profile_picture and old.profile_picture != instance.profile_picture:
        delete_s3_file(old.profile_picture.name)


# Delete image when user is deleted
@receiver(post_delete, sender=User)
def delete_profile_on_user_delete(sender, instance, **kwargs):
    if instance.profile_picture:
        delete_s3_file(instance.profile_picture.name)
