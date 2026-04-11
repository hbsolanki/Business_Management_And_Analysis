from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from .models import Message
from apps.chat.services.cloudinary_storage import delete_media


def get_public_id(field_file):
    """
    Get the raw filename from the field file.
    """
    if not field_file:
        return None
    return field_file.name


#  If message deleted
@receiver(post_delete, sender=Message)
def delete_media_on_message_delete(sender, instance, **kwargs):
    if instance.media:
        public_id = get_public_id(instance.media)
        if public_id:
            delete_media(public_id, instance.message_type)
