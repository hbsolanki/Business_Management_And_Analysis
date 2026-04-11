import io
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.chat.models import Message, Conversation

class MessageTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment(has_chat=True)
        # self.conv_a1: owner_a <-> manager_a1
        # self.conv_b1: owner_b <-> manager_b1

    def create_test_image(self):
        file = io.BytesIO()
        image = Image.new('RGB', (100, 100))
        image.save(file, 'jpeg')
        file.name = 'test.jpg'
        file.seek(0)
        return SimpleUploadedFile(file.name, file.read(), content_type='image/jpeg')

    def test_message_crud(self):
        # Message CRUD Own
        self.client.force_authenticate(user=self.owner_a)
        
        # 1. Create message (Manual create)
        msg = Message.objects.create_message(
            conversation=self.conv_a1,
            sender=self.owner_a,
            text="Hello world"
        )
        
        # 2. Update message
        detail_url = reverse('messages-detail', kwargs={'pk': msg.id})
        response = self.client.patch(detail_url, {"text": "Updated message"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        msg.refresh_from_db()
        self.assertEqual(msg.text, "Updated message")
        self.assertTrue(msg.is_updated)
        
        # 3. Delete message
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        msg.refresh_from_db()
        self.assertTrue(msg.is_deleted)
        self.assertFalse(msg.is_active)

    def test_message_crud_by_other_user(self):
        # Message CRUD Other
        msg_a = Message.objects.create_message(
            conversation=self.conv_a1,
            sender=self.owner_a,
            text="Owner A message"
        )
        self.client.force_authenticate(user=self.manager_b1)
        detail_url = reverse('messages-detail', kwargs={'pk': msg_a.id})
        
        response = self.client.patch(detail_url, {"text": "Hacked message"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        msg_a.refresh_from_db()
        self.assertFalse(msg_a.is_deleted)

    def test_message_by_conversation(self):
        # Message List Conv
        self.client.force_authenticate(user=self.owner_a)
        for i in range(5):
            Message.objects.create_message(
                conversation=self.conv_a1,
                sender=self.owner_a,
                text=f"Msg A {i}"
            )
        by_conv_url = reverse('messages-by-conversation', kwargs={'conversation_id': self.conv_a1.id})
        response = self.client.get(by_conv_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)

    def test_message_by_conversation_by_other_user(self):
        # Message List Conv Other
        self.client.force_authenticate(user=self.manager_b1)
        by_conv_url = reverse('messages-by-conversation', kwargs={'conversation_id': self.conv_a1.id})
        response = self.client.get(by_conv_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_message_media_upload(self):
        # Message Media Upload
        self.client.force_authenticate(user=self.owner_a)
        upload_url = reverse('messages-message-media-upload', kwargs={'conversation_id': self.conv_a1.id})
        image = self.create_test_image()
        response = self.client.post(upload_url, {"media": image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message_type'], "IMAGE")
        
        # 2. Over 20MB limit failure
        large_file = SimpleUploadedFile("too_big.txt", b"x" * (20 * 1024 * 1024 + 1))
        response = self.client.post(upload_url, {"media": large_file}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_message_media_upload_by_other_user(self):
        # Message Media Other
        self.client.force_authenticate(user=self.manager_b1)
        upload_url = reverse('messages-message-media-upload', kwargs={'conversation_id': self.conv_a1.id})
        image = self.create_test_image()
        response = self.client.post(upload_url, {"media": image}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_message_bulk_delete(self):
        # Message Bulk Own
        self.client.force_authenticate(user=self.owner_a)
        bulk_url = reverse('messages-bulk-delete')
        msg1 = Message.objects.create_message(self.conv_a1, self.owner_a, "Msg1")
        msg2 = Message.objects.create_message(self.conv_a1, self.owner_a, "Msg2")
        
        response = self.client.post(bulk_url, {"ids": [msg1.id, msg2.id]})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # bulk_delete endpoint performs hard delete (queryset.delete())
        self.assertFalse(Message.objects.filter(id__in=[msg1.id, msg2.id]).exists())
        
        response = self.client.post(bulk_url, {"ids": []})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_message_bulk_delete_by_other_user(self):
        # Message Bulk Other
        # Message for Owner A
        msg_a = Message.objects.create_message(self.conv_a1, self.owner_a, "Owner A messsage")
        # Meesage for Owner B
        msg_b = Message.objects.create_message(self.conv_b1, self.owner_b, "Owner B Message")
        
        # Manager B (Business B) tries to delete Owner A's message
        self.client.force_authenticate(user=self.manager_b1)
        bulk_url = reverse('messages-bulk-delete')
        
        # 1. Purely other user's message -> 403
        response = self.client.post(bulk_url, {"ids": [msg_a.id]})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        msg_a.refresh_from_db()
        self.assertFalse(msg_a.is_deleted)
        
        # 2. Mixed Ownership
        # Manager B creates their own message
        msg_manager_b = Message.objects.create_message(self.conv_b1, self.manager_b1, "Manager B Message")
        
        # Mixed: msg_manager_b (own) + msg_a (other) -> 403
        payload = {"ids": [msg_manager_b.id, msg_a.id]}
        response = self.client.post(bulk_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Ensure none were deleted
        msg_manager_b.refresh_from_db()
        msg_a.refresh_from_db()
        self.assertFalse(msg_manager_b.is_deleted)
        self.assertFalse(msg_a.is_deleted)
