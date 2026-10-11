import io
import pytest
from unittest.mock import patch
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.chat.models import Message

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def env():
    """Fixture to provide the base environment setup."""
    class Env(BaseTestCase):
        def __init__(self):
            pass
            
        def create_test_image(self):
            file = io.BytesIO()
            image = Image.new('RGB', (100, 100))
            image.save(file, 'jpeg')
            file.name = 'test.jpg'
            file.seek(0)
            return SimpleUploadedFile(file.name, file.read(), content_type='image/jpeg')
    
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment(has_chat=True)
    return tc

@pytest.mark.django_db
class TestMessage:

    def test_message_crud(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        msg = Message.objects.create_message(
            conversation=env.conv_a1,
            sender=env.owner_a,
            text="Hello world"
        )
        sut_url = reverse('messages-detail', kwargs={'pk': msg.id})
        
        # Act - Update message
        sut_response_update = api_client.patch(sut_url, {"text": "Updated message"}, format='json')
        
        # Assert
        assert sut_response_update.status_code == status.HTTP_200_OK
        msg.refresh_from_db()
        assert msg.text == "Updated message"
        assert msg.is_updated
        
        # Act - Delete message
        sut_response_delete = api_client.delete(sut_url)
        
        # Assert
        assert sut_response_delete.status_code == status.HTTP_204_NO_CONTENT
        msg.refresh_from_db()
        assert msg.is_deleted
        assert not msg.is_active

    def test_message_crud_by_other_user(self, api_client, env):
        # Arrange
        msg_a = Message.objects.create_message(
            conversation=env.conv_a1,
            sender=env.owner_a,
            text="Owner A message"
        )
        api_client.force_authenticate(user=env.manager_b1)
        sut_url = reverse('messages-detail', kwargs={'pk': msg_a.id})
        
        # Act - Update
        sut_response_update = api_client.patch(sut_url, {"text": "Hacked message"}, format='json')
        
        # Assert
        assert sut_response_update.status_code == status.HTTP_404_NOT_FOUND
        
        # Act - Delete
        sut_response_delete = api_client.delete(sut_url)
        
        # Assert
        assert sut_response_delete.status_code == status.HTTP_404_NOT_FOUND
        msg_a.refresh_from_db()
        assert not msg_a.is_deleted

    def test_message_by_conversation(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        for i in range(5):
            Message.objects.create_message(
                conversation=env.conv_a1,
                sender=env.owner_a,
                text=f"Msg A {i}"
            )
        sut_url = reverse('messages-by-conversation', kwargs={'conversation_id': env.conv_a1.id})
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert len(sut_response.data['results']) == 5

    def test_message_by_conversation_by_other_user(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.manager_b1)
        sut_url = reverse('messages-by-conversation', kwargs={'conversation_id': env.conv_a1.id})
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    @patch.object(Message.media.field.storage, 'save', return_value='bma/chat/test.jpg')
    def test_message_media_upload(self, mock_storage, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        sut_url = reverse('messages-message-media-upload', kwargs={'conversation_id': env.conv_a1.id})
        image = env.create_test_image()
        
        # Act - 1. Valid upload
        sut_response_upload = api_client.post(sut_url, {"media": image}, format='multipart')

        # Assert
        assert sut_response_upload.status_code == status.HTTP_201_CREATED
        assert sut_response_upload.data['message_type'] == "IMAGE"
        
        # Arrange - 2. Over 20MB limit failure
        large_file = SimpleUploadedFile("too_big.txt", b"x" * (20 * 1024 * 1024 + 1))
        
        # Act
        sut_response_large = api_client.post(sut_url, {"media": large_file}, format='multipart')
        
        # Assert
        assert sut_response_large.status_code == status.HTTP_400_BAD_REQUEST

    def test_message_media_upload_by_other_user(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.manager_b1)
        sut_url = reverse('messages-message-media-upload', kwargs={'conversation_id': env.conv_a1.id})
        image = env.create_test_image()
        
        # Act
        sut_response = api_client.post(sut_url, {"media": image}, format='multipart')
        
        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_message_bulk_delete(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        sut_url = reverse('messages-bulk-delete')
        msg1 = Message.objects.create_message(env.conv_a1, env.owner_a, "Msg1")
        msg2 = Message.objects.create_message(env.conv_a1, env.owner_a, "Msg2")
        
        # Act
        sut_response_valid = api_client.post(sut_url, {"ids": [msg1.id, msg2.id]})
        
        # Assert
        assert sut_response_valid.status_code == status.HTTP_200_OK
        assert not Message.objects.filter(id__in=[msg1.id, msg2.id]).exists()
        
        # Act - empty
        sut_response_empty = api_client.post(sut_url, {"ids": []})
        
        # Assert
        assert sut_response_empty.status_code == status.HTTP_400_BAD_REQUEST

    def test_message_bulk_delete_by_other_user(self, api_client, env):
        # Arrange
        msg_a = Message.objects.create_message(env.conv_a1, env.owner_a, "Owner A messsage")
        Message.objects.create_message(env.conv_b1, env.owner_b, "Owner B Message")
        api_client.force_authenticate(user=env.manager_b1)
        sut_url = reverse('messages-bulk-delete')
        
        # Act - 1. Purely other user's message
        sut_response_other = api_client.post(sut_url, {"ids": [msg_a.id]})
        
        # Assert
        assert sut_response_other.status_code == status.HTTP_403_FORBIDDEN
        msg_a.refresh_from_db()
        assert not msg_a.is_deleted
        
        # Arrange - 2. Mixed Ownership
        msg_manager_b = Message.objects.create_message(env.conv_b1, env.manager_b1, "Manager B Message")
        payload = {"ids": [msg_manager_b.id, msg_a.id]}
        
        # Act
        sut_response_mixed = api_client.post(sut_url, payload, format='json')
        
        # Assert
        assert sut_response_mixed.status_code == status.HTTP_403_FORBIDDEN
        msg_manager_b.refresh_from_db()
        msg_a.refresh_from_db()
        assert not msg_manager_b.is_deleted
        assert not msg_a.is_deleted
