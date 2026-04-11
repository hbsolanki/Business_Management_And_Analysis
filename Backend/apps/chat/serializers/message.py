import cloudinary
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

        # Map DB message_type to Cloudinary resource_type
        # TextChoices: IMAGE, VIDEO, FILE, TEXT
        res_type_map = {
            "IMAGE": "image",
            "VIDEO": "video",
            "FILE": "raw",
            "TEXT": "raw"
        }
        res_type = res_type_map.get(obj.message_type, "raw")
        
        # Use simple URL generation if possible, or CloudinaryResource
        try:
             # cloudinary.CloudinaryResource(public_id, default_resource_type=...)
             return cloudinary.CloudinaryResource(
                obj.media.name, 
                default_resource_type=res_type
            ).url
        except Exception:
            return obj.media.url

class MessageMediaUploadSerializer(serializers.Serializer):
    media = serializers.FileField()

    def validate_media(self, value):
        # 20MB limit
        limit = 20 * 1024 * 1024
        if value.size > limit:
            raise serializers.ValidationError("File size exceeds 20MB limit.")
        return value
