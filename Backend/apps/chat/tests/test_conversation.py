import pytest
from rest_framework import status
from django.urls import reverse
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.chat.models import Conversation

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def env():
    """Fixture to provide the base environment setup."""
    class Env(BaseTestCase):
        def __init__(self):
            pass
    
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment(has_chat=True)
    tc.url = reverse('conversation-list')
    return tc

@pytest.mark.django_db
class TestConversation:

    def test_conversation_crud(self, api_client, env):
        # Arrange
        sut_url = env.url
        api_client.force_authenticate(user=env.owner_a)
        
        # Act - List
        sut_response_list = api_client.get(sut_url)
        
        # Assert
        assert sut_response_list.status_code == status.HTTP_200_OK
        assert len(sut_response_list.data['results']) == 2

        # Arrange - Read detail
        sut_detail_url = reverse('conversation-detail', kwargs={'pk': env.conv_a1.id})
        
        # Act
        sut_response_detail = api_client.get(sut_detail_url)
        
        # Assert
        assert sut_response_detail.status_code == status.HTTP_200_OK

        # Arrange - Delete
        sut_delete_url = reverse('conversation-detail', kwargs={'pk': env.conv_a2.id})
        
        # Act
        sut_response_delete = api_client.delete(sut_delete_url)
        
        # Assert
        assert sut_response_delete.status_code == status.HTTP_204_NO_CONTENT
        assert not Conversation.objects.filter(id=env.conv_a2.id).exists()

    def test_conversation_bulk_delete(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        sut_url = reverse('conversation-bulk-delete')

        # Act - 1. Test empty list
        sut_response_empty = api_client.post(sut_url, {"ids": []}, format='json')
        
        # Assert
        assert sut_response_empty.status_code == status.HTTP_400_BAD_REQUEST

        # Arrange - 2. Delete conv_a1 and conv_a2
        payload = {"ids": [env.conv_a1.id, env.conv_a2.id]}
        
        # Act
        sut_response_bulk = api_client.post(sut_url, payload, format='json')

        # Assert
        assert sut_response_bulk.status_code == status.HTTP_200_OK
        assert not Conversation.objects.filter(id=env.conv_a1.id).exists()
        assert not Conversation.objects.filter(id=env.conv_a2.id).exists()

    def test_conversation_crud_by_third_user(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_b)
        sut_url = reverse('conversation-detail', kwargs={'pk': env.conv_a1.id})
        
        # Act - Read
        sut_response_read = api_client.get(sut_url)
        
        # Assert
        assert sut_response_read.status_code == status.HTTP_404_NOT_FOUND

        # Act - Delete
        sut_response_delete = api_client.delete(sut_url)
        
        # Assert
        assert sut_response_delete.status_code == status.HTTP_404_NOT_FOUND
        assert Conversation.objects.filter(id=env.conv_a1.id).exists()

    def test_conversation_bulk_delete_third_user(self, api_client, env):
        # Arrange
        api_client.force_authenticate(user=env.owner_b)
        sut_url = reverse('conversation-bulk-delete')
        payload = {"ids": [env.conv_b1.id, env.conv_a1.id]}
        
        # Act
        sut_response = api_client.post(sut_url, payload, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert not Conversation.objects.filter(id=env.conv_b1.id).exists()
        assert Conversation.objects.filter(id=env.conv_a1.id).exists()

    def test_conversation_get_or_create_behavior(self, api_client, env):
        # Arrange
        sut_url = env.url
        api_client.force_authenticate(user=env.owner_a)
        payload = {"user_id": env.manager_a1.id}
        
        # Act
        sut_response = api_client.post(sut_url, payload, format='json')
        
        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
