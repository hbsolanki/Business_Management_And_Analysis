import os
import cloudinary.uploader
from cloudinary_storage.storage import MediaCloudinaryStorage
from apps.chat.utils.file_type import detect_message_type
# from apps.chat.models import Message (Circular import avoidance)

class MessageMediaCloudinaryStorage(MediaCloudinaryStorage):
    def _get_resource_type(self, name):
        """
        Dynamically determine resource type based on file extension/content.
        """
        
        # detect_message_type expects an object with a .name attribute
        message_type = detect_message_type(type("File", (object,), {"name": name})) 
        
        if message_type == "IMAGE":
            return "image"
        elif message_type == "VIDEO":
            return "video"
        else:
            return "raw"

    def _save(self, name, content):
        # Cloudinary's default _save returns a public_id that often lacks the extension 
        # (for images/videos). We MUST preserve the extension in the DB 
        # so that _get_resource_type can correctly identify the file type later.
        
        public_id = super()._save(name, content)
        
        ext = os.path.splitext(name)[1]
        if ext and not public_id.endswith(ext):
             return public_id + ext
        return public_id


def get_resource_type(message_type):
    """
    Map MessageType to Cloudinary resource_type
    """
    if message_type == "IMAGE":
        return "image"
    elif message_type == "VIDEO":
        return "video"
    else:
        return "raw"


def delete_media(public_id, message_type):
    """
    Delete media from Cloudinary.
    Handles extension stripping logic based on resource type.
    """
    if not public_id:
        return

    res_type = get_resource_type(message_type)
    final_public_id = public_id
    
    if res_type in ['image', 'video']:
        # Strip extension if present for image/video types
        base, ext = os.path.splitext(public_id)
        if ext:
            final_public_id = base
            
    # Try deleting
    result = cloudinary.uploader.destroy(final_public_id, resource_type=res_type, invalidate=True)
    
    # If failed (not found), try with original ID just in case
    if result.get('result') != 'ok' and final_public_id != public_id:
        cloudinary.uploader.destroy(public_id, resource_type=res_type, invalidate=True)
