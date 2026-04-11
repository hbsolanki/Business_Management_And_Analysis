from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.chat.models import BroadcastGroup, Message, Conversation

class BroadcastTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment(has_chat=True)
        self.url_list = reverse('broadcast-list')
        self.url_msg = reverse('broadcast-message-broadcast')

    def test_broadcast_create(self):
        # 1. Success Create
        self.client.force_authenticate(user=self.owner_a)
        payload = {
            "name": "Team Alpha",
            "users": [
                {"user_id": self.manager_a1.id},
                {"user_id": self.manager_a2.id}
            ]
        }
        response = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(BroadcastGroup.objects.count(), 1)
        
        # 2. Mixed Business
        payload = {
            "name": "Mixed Group",
            "users": [{"user_id": self.manager_b1.id}]
        }
        response = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # 3. Missing Name
        payload = {
            "users": [{"user_id": self.manager_a1.id}]
        }
        response = self.client.post(self.url_list, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_broadcast_list(self):
        # Broadcast List Success
        BroadcastGroup.objects.create(user=self.owner_a, name="Group 1")
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.url_list)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_broadcast_read(self):
        # Broadcast Read Success
        group = BroadcastGroup.objects.create(user=self.owner_a, name="Group 1")
        self.client.force_authenticate(user=self.owner_a)
        url = reverse('broadcast-detail', kwargs={'pk': group.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Group 1")

    def test_broadcast_update(self):
        # 1. Update Name
        group = BroadcastGroup.objects.create(user=self.owner_a, name="Old Name")
        self.client.force_authenticate(user=self.owner_a)
        url = reverse('broadcast-detail', kwargs={'pk': group.id})
        response = self.client.patch(url, {"name": "New Name"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        group.refresh_from_db()
        self.assertEqual(group.name, "New Name")

        # 2. Duplicate IDs
        payload = {
            "users": [
                {"user_id": self.manager_a1.id},
                {"user_id": self.manager_a1.id}
            ]
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(group.broadcast_group_members.count(), 2)

        # 3. Other Business
        payload = {
            "users": [{"user_id": self.manager_b1.id}]
        }
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Empty Users
        response = self.client.patch(url, {"users": []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(group.broadcast_group_members.count(), 0)

        # 5. Empty Name
        response = self.client.patch(url, {"name": ""}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_broadcast_delete(self):
        # Broadcast Delete Success
        group = BroadcastGroup.objects.create(user=self.owner_a, name="To Delete")
        self.client.force_authenticate(user=self.owner_a)
        url = reverse('broadcast-detail', kwargs={'pk': group.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(BroadcastGroup.objects.filter(id=group.id).exists())

    def test_broadcast_crud_by_other_user(self):
        # 1. Read Other
        group = BroadcastGroup.objects.create(user=self.owner_a, name="Owner A Group")
        self.client.force_authenticate(user=self.manager_b1)
        url = reverse('broadcast-detail', kwargs={'pk': group.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # 2. Update Other
        response = self.client.patch(url, {"name": "Hacked"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # 3. Delete Other
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(BroadcastGroup.objects.filter(id=group.id).exists())

    def test_message_broadcast(self):
        # 1. Single Recipient
        self.client.force_authenticate(user=self.owner_a)
        payload = {
            "message": "Hello 1",
            "users": [{"user_id": self.manager_a1.id}]
        }
        response = self.client.post(self.url_msg, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 2. Multiple Recipients
        payload = {
            "message": "Hello All",
            "users": [
                {"user_id": self.manager_a1.id},
                {"user_id": self.manager_a2.id}
            ]
        }
        response = self.client.post(self.url_msg, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 3. Large Message
        payload = {
            "message": "A" * 1000,
            "users": [{"user_id": self.manager_a1.id}]
        }
        response = self.client.post(self.url_msg, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_message_broadcast_by_other_user(self):
        # 1. Mixed Tenant
        self.client.force_authenticate(user=self.owner_a)
        payload = {
            "message": "Mixed",
            "users": [
                {"user_id": self.manager_a1.id},
                {"user_id": self.manager_b1.id}
            ]
        }
        response = self.client.post(self.url_msg, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Missing Message
        payload = {"users": [{"user_id": self.manager_a1.id}]}
        response = self.client.post(self.url_msg, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Empty Users
        payload = {"message": "Empty", "users": []}
        response = self.client.post(self.url_msg, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)