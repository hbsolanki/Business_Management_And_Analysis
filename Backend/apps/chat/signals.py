from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Message
from apps.chat.services.s3_storage import delete_media


def get_file_key(field_file):
    """
    Get the raw S3 key (file path) from the field file.
    """
    if not field_file:
        return None
    return field_file.name


#  If message deleted
@receiver(post_delete, sender=Message)
def delete_media_on_message_delete(sender, instance, **kwargs):
    if instance.media:
        file_key = get_file_key(instance.media)
        if file_key:
            delete_media(file_key, instance.message_type)
