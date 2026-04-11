import cloudinary.uploader
from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from apps.user.models import User


def get_public_id(field_file):
    if not field_file:
        return None
    return field_file.name.rsplit(".", 1)[0]


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
        public_id = get_public_id(old.profile_picture)
        if public_id:
            cloudinary.uploader.destroy(public_id)


# Delete image when user deleted
@receiver(post_delete, sender=User)
def delete_profile_on_user_delete(sender, instance, **kwargs):
    if instance.profile_picture:
        public_id = get_public_id(instance.profile_picture)
        if public_id:
            cloudinary.uploader.destroy(public_id)
