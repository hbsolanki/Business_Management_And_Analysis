import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.base.tests import BaseTestCase
from apps.ai_agent.models import AiChatSession, AiChatMessage, AiChatMessageSenderChoices
from apps.subscription.models import Subscription


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def ai_agent_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.url = reverse('ai-chat-session-list')
    AiChatSession.all_objects.all().delete()
    Subscription.objects.update(has_ai_agent=True)
    return tc


@pytest.mark.django_db
class TestAiAgent:

    def test_ai_chat_session_crud(self, api_client, ai_agent_env):
        # Arrange
        api_client.force_authenticate(user=ai_agent_env.owner_a)
        sut_url = ai_agent_env.url

        # Act - Create
        sut_create_res = api_client.post(sut_url, {"title": "New Session"}, format='json')

        # Assert - Create
        assert sut_create_res.status_code == status.HTTP_201_CREATED
        session_id = sut_create_res.data['id']

        # Act - List
        sut_list_res = api_client.get(sut_url)

        # Assert - List
        assert sut_list_res.status_code == status.HTTP_200_OK
        assert len(sut_list_res.data['results']) == 1

        # Arrange - Detail
        sut_detail_url = reverse('ai-chat-session-detail', kwargs={'pk': session_id})

        # Act - Update
        sut_patch_res = api_client.patch(sut_detail_url, {"title": "Updated Title"}, format='json')

        # Assert - Update
        assert sut_patch_res.status_code == status.HTTP_200_OK

        # Act - Delete
        sut_del_res = api_client.delete(sut_detail_url)

        # Assert - Delete
        assert sut_del_res.status_code == status.HTTP_204_NO_CONTENT

    def test_get_messages_by_session_id(self, api_client, ai_agent_env):
        # Arrange
        session = AiChatSession.objects.create(user=ai_agent_env.owner_a, title="Test Session")
        AiChatMessage.all_objects.all().delete()
        AiChatMessage.objects.create(session=session, sender=AiChatMessageSenderChoices.USER, content="Hello")

        api_client.force_authenticate(user=ai_agent_env.owner_a)
        sut_url = reverse('ai-chat-session-get-message-by-session-id', kwargs={'pk': session.id})

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert len(sut_response.data['results']) == 1

    def test_get_messages_by_different_session_id(self, api_client, ai_agent_env):
        # Arrange
        session1 = AiChatSession.objects.create(user=ai_agent_env.owner_a, title="S1")
        session2 = AiChatSession.objects.create(user=ai_agent_env.owner_a, title="S2")
        AiChatMessage.all_objects.all().delete()
        AiChatMessage.objects.create(session=session1, sender=AiChatMessageSenderChoices.USER, content="M1")
        AiChatMessage.objects.create(session=session2, sender=AiChatMessageSenderChoices.USER, content="M2")

        api_client.force_authenticate(user=ai_agent_env.owner_a)
        sut_url1 = reverse('ai-chat-session-get-message-by-session-id', kwargs={'pk': session1.id})

        # Act
        sut_response = api_client.get(sut_url1)

        # Assert
        assert len(sut_response.data['results']) == 1
        assert sut_response.data['results'][0]['content'][0]['value'] == "M1"

    def test_ai_chat_session_isolation(self, api_client, ai_agent_env):
        # Arrange
        session_b = AiChatSession.objects.create(user=ai_agent_env.owner_b, title="Private")
        api_client.force_authenticate(user=ai_agent_env.owner_a)
        sut_list_url = ai_agent_env.url
        sut_detail_url = reverse('ai-chat-session-detail', kwargs={'pk': session_b.id})

        # Act - List
        sut_list_res = api_client.get(sut_list_url)

        # Assert - List
        assert sut_list_res.status_code == status.HTTP_200_OK
        assert len(sut_list_res.data['results']) == 0

        # Act - Read detail of other user's session
        sut_detail_res = api_client.get(sut_detail_url)

        # Assert - Detail
        assert sut_detail_res.status_code == status.HTTP_404_NOT_FOUND

    def test_get_messages_isolation(self, api_client, ai_agent_env):
        # Arrange
        session_b = AiChatSession.objects.create(user=ai_agent_env.owner_b, title="Private")
        AiChatMessage.all_objects.all().delete()
        AiChatMessage.objects.create(session=session_b, sender=AiChatMessageSenderChoices.USER, content="Secret")

        api_client.force_authenticate(user=ai_agent_env.owner_a)
        sut_url = reverse('ai-chat-session-get-message-by-session-id', kwargs={'pk': session_b.id})

        # Act
        sut_response = api_client.get(sut_url)

        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND
