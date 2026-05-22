from django.urls import reverse
from rest_framework import status
from apps.base.tests import BaseTestCase
from apps.ai_agent.models import AiChatSession, AiChatMessage, AiChatMessageSenderChoices
from apps.subscription.models import Subscription
from django.test import TestCase

# Import trigger tools
from apps.ai_agent.tools.manage_agent_tools.product_category import trigger_add_product_category
from apps.ai_agent.tools.manage_agent_tools.product import trigger_add_product
from apps.ai_agent.tools.manage_agent_tools.branch import trigger_add_branch
from apps.ai_agent.tools.manage_agent_tools.cost_category import trigger_add_cost_category
from apps.ai_agent.tools.manage_agent_tools.task import trigger_add_task
from apps.ai_agent.tools.manage_agent_tools.supplier import trigger_add_supplier, trigger_add_purchase_order, trigger_add_sales_order

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
        # Content is now a list of blocks: [{'type': 'text', 'value': 'M1'}]
        self.assertEqual(response.data['results'][0]['content'][0]['value'], "M1")

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

class AiAgentToolsTestCase(TestCase):
    async def test_trigger_add_product_category(self):
        res = await trigger_add_product_category(name="chapter", description="history book")
        self.assertEqual(res["type"], "panel_trigger")
        self.assertEqual(res["panel"], "add_product_category")
        self.assertEqual(res["initial_data"]["name"], "chapter")
        self.assertEqual(res["initial_data"]["description"], "history book")

    async def test_trigger_add_product(self):
        res = await trigger_add_product(name="Audio Driver", sku="AUD-100", cost_price="100.00")
        self.assertEqual(res["type"], "panel_trigger")
        self.assertEqual(res["panel"], "add_product")
        self.assertEqual(res["initial_data"]["name"], "Audio Driver")
        self.assertEqual(res["initial_data"]["sku"], "AUD-100")
        self.assertEqual(res["initial_data"]["cost_price"], "100.00")

    async def test_trigger_add_branch(self):
        res = await trigger_add_branch(name="New Branch", city="Mumbai")
        self.assertEqual(res["type"], "panel_trigger")
        self.assertEqual(res["panel"], "add_branch")
        self.assertEqual(res["initial_data"]["name"], "New Branch")
        self.assertEqual(res["initial_data"]["city"], "Mumbai")

    async def test_trigger_add_cost_category(self):
        res = await trigger_add_cost_category(name="Marketing", gst_rate="18.00")
        self.assertEqual(res["type"], "panel_trigger")
        self.assertEqual(res["panel"], "add_cost_category")
        self.assertEqual(res["initial_data"]["name"], "Marketing")
        self.assertEqual(res["initial_data"]["gst_rate"], "18.00")

    async def test_trigger_add_task(self):
        res = await trigger_add_task(title="Review Budget", description="Check expenses", remarks="high priority")
        self.assertEqual(res["type"], "panel_trigger")
        self.assertEqual(res["panel"], "add_task")
        self.assertEqual(res["initial_data"]["title"], "Review Budget")
        self.assertEqual(res["initial_data"]["description"], "Check expenses")
        self.assertEqual(res["initial_data"]["remarks"], "high priority")

    async def test_trigger_add_supplier(self):
        res = await trigger_add_supplier(name="Global Supplier", contact_person="John Doe", mobile_number="9876543210")
        self.assertEqual(res["type"], "panel_trigger")
        self.assertEqual(res["panel"], "add_supplier")
        self.assertEqual(res["initial_data"]["name"], "Global Supplier")
        self.assertEqual(res["initial_data"]["contact_person"], "John Doe")
        self.assertEqual(res["initial_data"]["mobile_number"], "9876543210")

    async def test_trigger_add_purchase_order(self):
        res = await trigger_add_purchase_order(branch_id=1, supplier_id=2, notes="Test PO notes")
        self.assertEqual(res["type"], "panel_trigger")
        self.assertEqual(res["panel"], "add_purchase_order")
        self.assertEqual(res["initial_data"]["branch_id"], 1)
        self.assertEqual(res["initial_data"]["supplier_id"], 2)
        self.assertEqual(res["initial_data"]["notes"], "Test PO notes")

    async def test_trigger_add_sales_order(self):
        res = await trigger_add_sales_order(branch_id=1, customer_id=3, notes="Test SO notes")
        self.assertEqual(res["type"], "panel_trigger")
        self.assertEqual(res["panel"], "add_sales_order")
        self.assertEqual(res["initial_data"]["branch_id"], 1)
        self.assertEqual(res["initial_data"]["customer_id"], 3)
        self.assertEqual(res["initial_data"]["notes"], "Test SO notes")
