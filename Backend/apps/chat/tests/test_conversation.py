from rest_framework import status
from django.urls import reverse
from apps.base.tests import BaseTestCase
from apps.chat.models import Conversation

class ConversationTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment(has_chat=True)
        self.url = reverse('conversation-list')

    def test_conversation_crud(self):
        # Conversation CRUD Own
        self.client.force_authenticate(user=self.owner_a)
        # List (should find conv_a1 and conv_a2)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

        # Read detail
        detail_url = reverse('conversation-detail', kwargs={'pk': self.conv_a1.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Delete
        delete_url = reverse('conversation-detail', kwargs={'pk': self.conv_a2.id})
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Conversation.objects.filter(id=self.conv_a2.id).exists())

    def test_conversation_bulk_delete(self):
        # Conversation Bulk Own
        self.client.force_authenticate(user=self.owner_a)
        bulk_delete_url = reverse('conversation-bulk-delete')

        # 1. Test empty list (should be 400 because allow_empty=False in BulkIdSerializer)
        response = self.client.post(bulk_delete_url, {"ids": []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Delete conv_a1 and conv_a2
        payload = {"ids": [self.conv_a1.id, self.conv_a2.id]}
        response = self.client.post(bulk_delete_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Conversation.objects.filter(id=self.conv_a1.id).exists())
        self.assertFalse(Conversation.objects.filter(id=self.conv_a2.id).exists())

    def test_conversation_crud_by_third_user(self):
        # Conversation CRUD Third
        # Authenticate as owner_b (not in conv_a1)
        self.client.force_authenticate(user=self.owner_b)
        
        # Try to access conv_a1
        detail_url = reverse('conversation-detail', kwargs={'pk': self.conv_a1.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Try to delete conv_a1
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Conversation.objects.filter(id=self.conv_a1.id).exists())

    def test_conversation_bulk_delete_third_user(self):
        # Conversation Bulk Third
        # Authenticate as owner_b
        self.client.force_authenticate(user=self.owner_b)
        bulk_delete_url = reverse('conversation-bulk-delete')
        
        # Mixed test: one true conv_id (for owner_b) but second is not (owner_a's)
        payload = {"ids": [self.conv_b1.id, self.conv_a1.id]}
        response = self.client.post(bulk_delete_url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify conv_b1 is deleted (was authorized) but conv_a1 is not
        self.assertFalse(Conversation.objects.filter(id=self.conv_b1.id).exists())
        self.assertTrue(Conversation.objects.filter(id=self.conv_a1.id).exists())

    def test_conversation_get_or_create_behavior(self):
        # SO Sync Create
        self.client.force_authenticate(user=self.owner_a)
        # Attempt to create conversation with manager_a1 (already exists as conv_a1)
        payload = {"user_id": self.manager_a1.id}
        
        # Should return existing
        response = self.client.post(self.url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
