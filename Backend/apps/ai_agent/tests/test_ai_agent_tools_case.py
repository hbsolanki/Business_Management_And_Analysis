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
