import json
from unittest.mock import patch, AsyncMock
from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from channels.testing import WebsocketCommunicator
from apps.base.tests import BaseTestCase
from apps.ai_agent.models import AiChatSession, AiChatMessage, AiChatMessageSenderChoices
from apps.subscription.models import Subscription
from bma.asgi import application

class AiAgentTestCase(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.url = reverse('ai-chat-session-list')
        # Ensure complete cleanup across test methods
        AiChatSession.all_objects.all().delete()
        Subscription.objects.update(has_ai_agent=True)

    def test_ai_chat_session_crud(self):
        # Create
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(self.url, {"title": "New Session"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session_id = response.data['id']

        # List
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Paginated response has 'results'
        self.assertEqual(len(response.data['results']), 1)

        # Update
        detail_url = reverse('ai-chat-session-detail', kwargs={'pk': session_id})
        response = self.client.patch(detail_url, {"title": "Updated Title"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Delete
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_get_messages_by_session_id(self):
        session = AiChatSession.objects.create(user=self.owner_a, title="Test Session")
        AiChatMessage.all_objects.all().delete()
        AiChatMessage.objects.create(session=session, sender=AiChatMessageSenderChoices.USER, content="Hello")
        
        self.client.force_authenticate(user=self.owner_a)
        url = reverse('ai-chat-session-get-message-by-session-id', kwargs={'pk': session.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_get_messages_by_different_session_id(self):
        session1 = AiChatSession.objects.create(user=self.owner_a, title="S1")
        session2 = AiChatSession.objects.create(user=self.owner_a, title="S2")
        AiChatMessage.all_objects.all().delete()
        AiChatMessage.objects.create(session=session1, sender=AiChatMessageSenderChoices.USER, content="M1")
        AiChatMessage.objects.create(session=session2, sender=AiChatMessageSenderChoices.USER, content="M2")

        self.client.force_authenticate(user=self.owner_a)
        url1 = reverse('ai-chat-session-get-message-by-session-id', kwargs={'pk': session1.id})
        response = self.client.get(url1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['content'], "M1")

    def test_ai_chat_session_isolation(self):
        session_b = AiChatSession.objects.create(user=self.owner_b, title="Private")
        
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

        detail_url = reverse('ai-chat-session-detail', kwargs={'pk': session_b.id})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_messages_isolation(self):
        session_b = AiChatSession.objects.create(user=self.owner_b, title="Private")
        AiChatMessage.all_objects.all().delete()
        AiChatMessage.objects.create(session=session_b, sender=AiChatMessageSenderChoices.USER, content="Secret")

        self.client.force_authenticate(user=self.owner_a)
        url = reverse('ai-chat-session-get-message-by-session-id', kwargs={'pk': session_b.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
