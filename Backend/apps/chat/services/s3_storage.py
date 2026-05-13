import os
import boto3
from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings
from apps.chat.utils.file_type import detect_message_type


class MessageMediaS3Storage(S3Boto3Storage):
    """
    Custom S3 storage for chat message media.
    All chat files are stored under the bma/chat/ prefix.
    """
    location = "bma/chat"
    file_overwrite = False


def delete_media(file_key, message_type=None):
    """
    Delete a media file from S3 by its key (the value stored in Message.media.name).
    message_type is kept for API compatibility but is no longer required for S3.
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
        # Log but don't raise — a failed delete should not crash the app
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"[S3] Failed to delete {file_key}: {e}")
