import os
import uuid

def user_avatar_path(instance, filename):
    """
    Generates a secure, unique, and structured upload path for user avatars.
    Path format: bma/profile_pictures/user_<id>/<uuid>.<extension>
    
    Using a UUID prevents enumeration attacks and filename collisions on the cloud storage.
    """
    # Extract extension and convert to lowercase for consistency
    ext = filename.split('.')[-1].lower()
    
    # Generate unique filename using UUID
    unique_filename = f"{uuid.uuid4()}.{ext}"
    
    # Return OS-independent path
    return os.path.join("bma", "profile_pictures", f"user_{instance.id}", unique_filename)
