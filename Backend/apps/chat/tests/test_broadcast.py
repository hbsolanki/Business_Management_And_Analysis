import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.chat.models import BroadcastGroup

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
    tc.url_list = reverse('broadcast-list')
    tc.url_msg = reverse('broadcast-message-broadcast')
    return tc

@pytest.mark.django_db
class TestBroadcast:

    def test_broadcast_create(self, api_client, env):
        # Arrange - 1. Success Create
        sut_url = env.url_list
        api_client.force_authenticate(user=env.owner_a)
        payload_success = {
            "name": "Team Alpha",
            "users": [
                {"user_id": env.manager_a1.id},
                {"user_id": env.manager_a2.id}
            ]
        }
        
        # Act
        sut_response_success = api_client.post(sut_url, payload_success, format='json')
        
        # Assert
        assert sut_response_success.status_code == status.HTTP_201_CREATED
        assert BroadcastGroup.objects.count() == 1
        
        # Arrange - 2. Mixed Business
        payload_mixed = {
            "name": "Mixed Group",
            "users": [{"user_id": env.manager_b1.id}]
        }
        
        # Act
        sut_response_mixed = api_client.post(sut_url, payload_mixed, format='json')
        
        # Assert
        assert sut_response_mixed.status_code == status.HTTP_400_BAD_REQUEST
        
        # Arrange - 3. Missing Name
        payload_missing_name = {
            "users": [{"user_id": env.manager_a1.id}]
        }
        
        # Act
        sut_response_missing = api_client.post(sut_url, payload_missing_name, format='json')
        
        # Assert
        assert sut_response_missing.status_code == status.HTTP_400_BAD_REQUEST

    def test_broadcast_list(self, api_client, env):
        # Arrange
        BroadcastGroup.objects.create(user=env.owner_a, name="Group 1")
        api_client.force_authenticate(user=env.owner_a)
        sut_url = env.url_list
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert len(sut_response.data) == 1

    def test_broadcast_read(self, api_client, env):
        # Arrange
        group = BroadcastGroup.objects.create(user=env.owner_a, name="Group 1")
        api_client.force_authenticate(user=env.owner_a)
        sut_url = reverse('broadcast-detail', kwargs={'pk': group.id})
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert sut_response.data['name'] == "Group 1"

    def test_broadcast_update(self, api_client, env):
        # Arrange
        group = BroadcastGroup.objects.create(user=env.owner_a, name="Old Name")
        api_client.force_authenticate(user=env.owner_a)
        sut_url = reverse('broadcast-detail', kwargs={'pk': group.id})
        
        # Act - 1. Update Name
        sut_response_name = api_client.patch(sut_url, {"name": "New Name"}, format='json')
        
        # Assert
        assert sut_response_name.status_code == status.HTTP_200_OK
        group.refresh_from_db()
        assert group.name == "New Name"

        # Arrange - 2. Duplicate IDs
        payload_duplicate = {
            "users": [
                {"user_id": env.manager_a1.id},
                {"user_id": env.manager_a1.id}
            ]
        }
        
        # Act
        sut_response_duplicate = api_client.patch(sut_url, payload_duplicate, format='json')
        
        # Assert
        assert sut_response_duplicate.status_code == status.HTTP_400_BAD_REQUEST


        # Arrange - 3. Other Business
        payload_other = {
            "users": [{"user_id": env.manager_b1.id}]
        }
        
        # Act
        sut_response_other = api_client.patch(sut_url, payload_other, format='json')
        
        # Assert
        assert sut_response_other.status_code == status.HTTP_400_BAD_REQUEST

        # Act - 4. Empty Users
        sut_response_empty_users = api_client.patch(sut_url, {"users": []}, format='json')
        
        # Assert
        assert sut_response_empty_users.status_code == status.HTTP_200_OK
        assert group.broadcast_group_members.count() == 0

        # Act - 5. Empty Name
        sut_response_empty_name = api_client.patch(sut_url, {"name": ""}, format='json')
        
        # Assert
        assert sut_response_empty_name.status_code == status.HTTP_400_BAD_REQUEST

    def test_broadcast_delete(self, api_client, env):
        # Arrange
        group = BroadcastGroup.objects.create(user=env.owner_a, name="To Delete")
        api_client.force_authenticate(user=env.owner_a)
        sut_url = reverse('broadcast-detail', kwargs={'pk': group.id})
        
        # Act
        sut_response = api_client.delete(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_204_NO_CONTENT
        assert not BroadcastGroup.objects.filter(id=group.id).exists()

    def test_broadcast_crud_by_other_user(self, api_client, env):
        # Arrange
        group = BroadcastGroup.objects.create(user=env.owner_a, name="Owner A Group")
        api_client.force_authenticate(user=env.manager_b1)
        sut_url = reverse('broadcast-detail', kwargs={'pk': group.id})
        
        # Act - 1. Read Other
        sut_response_read = api_client.get(sut_url)
        
        # Assert
        assert sut_response_read.status_code == status.HTTP_404_NOT_FOUND

        # Act - 2. Update Other
        sut_response_update = api_client.patch(sut_url, {"name": "Hacked"}, format='json')
        
        # Assert
        assert sut_response_update.status_code == status.HTTP_404_NOT_FOUND

        # Act - 3. Delete Other
        sut_response_delete = api_client.delete(sut_url)
        
        # Assert
        assert sut_response_delete.status_code == status.HTTP_404_NOT_FOUND
        assert BroadcastGroup.objects.filter(id=group.id).exists()

    def test_message_broadcast(self, api_client, env):
        # Arrange
        sut_url = env.url_msg
        api_client.force_authenticate(user=env.owner_a)
        
        # Arrange - 1. Single Recipient
        payload_single = {
            "message": "Hello 1",
            "users": [{"user_id": env.manager_a1.id}]
        }
        
        # Act
        sut_response_single = api_client.post(sut_url, payload_single, format='json')
        
        # Assert
        assert sut_response_single.status_code == status.HTTP_200_OK
        
        # Arrange - 2. Multiple Recipients
        payload_multiple = {
            "message": "Hello All",
            "users": [
                {"user_id": env.manager_a1.id},
                {"user_id": env.manager_a2.id}
            ]
        }
        
        # Act
        sut_response_multi = api_client.post(sut_url, payload_multiple, format='json')
        
        # Assert
        assert sut_response_multi.status_code == status.HTTP_200_OK

        # Arrange - 3. Large Message
        payload_large = {
            "message": "A" * 1000,
            "users": [{"user_id": env.manager_a1.id}]
        }
        
        # Act
        sut_response_large = api_client.post(sut_url, payload_large, format='json')
        
        # Assert
        assert sut_response_large.status_code == status.HTTP_200_OK

    def test_message_broadcast_by_other_user(self, api_client, env):
        # Arrange
        sut_url = env.url_msg
        api_client.force_authenticate(user=env.owner_a)
        
        # Arrange - 1. Mixed Tenant
        payload_mixed = {
            "message": "Mixed",
            "users": [
                {"user_id": env.manager_a1.id},
                {"user_id": env.manager_b1.id}
            ]
        }
        
        # Act
        sut_response_mixed = api_client.post(sut_url, payload_mixed, format='json')
        
        # Assert
        assert sut_response_mixed.status_code == status.HTTP_400_BAD_REQUEST

        # Arrange - 2. Missing Message
        payload_missing_msg = {"users": [{"user_id": env.manager_a1.id}]}
        
        # Act
        sut_response_missing = api_client.post(sut_url, payload_missing_msg, format='json')
        
        # Assert
        assert sut_response_missing.status_code == status.HTTP_400_BAD_REQUEST

        # Arrange - 3. Empty Users
        payload_empty = {"message": "Empty", "users": []}
        
        # Act
        sut_response_empty = api_client.post(sut_url, payload_empty, format='json')
        
        # Assert
        assert sut_response_empty.status_code == status.HTTP_400_BAD_REQUEST