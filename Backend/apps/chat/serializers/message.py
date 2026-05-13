from rest_framework import serializers
from apps.chat.models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(read_only=True)
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "sender_id",
            "text",
            "media_url",
            "message_type",
            "created_at",
            "is_updated"
        ]

    def get_media_url(self, obj):
        if not obj.media:
            return None
        # With S3, obj.media.url returns the full S3/CDN URL directly
        try:
            return obj.media.url
        except Exception:
            return obj.media.name


class MessageMediaUploadSerializer(serializers.Serializer):
    media = serializers.FileField()

    def validate_media(self, value):
        # 20MB limit
        limit = 20 * 1024 * 1024
        if value.size > limit:
            raise serializers.ValidationError("File size exceeds 20MB limit.")
        return value
