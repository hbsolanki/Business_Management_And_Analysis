from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from apps.ai_agent.tools.manage_agent_tools.product_category import trigger_add_product_category
from apps.ai_agent.tools.manage_agent_tools.product import trigger_add_product
from apps.ai_agent.tools.manage_agent_tools.branch import trigger_add_branch
from apps.ai_agent.tools.manage_agent_tools.cost_category import trigger_add_cost_category
from apps.ai_agent.tools.manage_agent_tools.task import trigger_add_task
from apps.ai_agent.tools.manage_agent_tools.supplier import (
    trigger_add_supplier, 
    trigger_add_purchase_order, 
    trigger_add_sales_order
)


@pytest.mark.asyncio
@pytest.mark.django_db
class TestAiAgentTools:

    async def test_trigger_add_product_category(self):
        # Arrange
        name = "chapter"
        description = "history book"

        # Act
        sut_res = await trigger_add_product_category(name=name, description=description)

        # Assert
        assert sut_res["type"] == "panel_trigger"
        assert sut_res["panel"] == "add_product_category"
        assert sut_res["initial_data"]["name"] == name
        assert sut_res["initial_data"]["description"] == description

    async def test_trigger_add_product(self):
        # Arrange
        name = "Audio Driver"
        sku = "AUD-100"
        cost_price = "100.00"

        # Act
        sut_res = await trigger_add_product(name=name, sku=sku, cost_price=cost_price)

        # Assert
        assert sut_res["type"] == "panel_trigger"
        assert sut_res["panel"] == "add_product"
        assert sut_res["initial_data"]["name"] == name
        assert sut_res["initial_data"]["sku"] == sku
        assert sut_res["initial_data"]["cost_price"] == cost_price

    async def test_trigger_add_branch(self):
        # Arrange
        name = "New Branch"
        city = "Mumbai"

        # Act
        sut_res = await trigger_add_branch(name=name, city=city)

        # Assert
        assert sut_res["type"] == "panel_trigger"
        assert sut_res["panel"] == "add_branch"
        assert sut_res["initial_data"]["name"] == name
        assert sut_res["initial_data"]["city"] == city

    async def test_trigger_add_cost_category(self):
        # Arrange
        name = "Marketing"
        gst_rate = "18.00"

        # Act
        sut_res = await trigger_add_cost_category(name=name, gst_rate=gst_rate)

        # Assert
        assert sut_res["type"] == "panel_trigger"
        assert sut_res["panel"] == "add_cost_category"
        assert sut_res["initial_data"]["name"] == name
        assert sut_res["initial_data"]["gst_rate"] == gst_rate

    async def test_trigger_add_task(self):
        # Arrange
        title = "Review Budget"
        description = "Check expenses"
        remarks = "high priority"

        # Act
        sut_res = await trigger_add_task(title=title, description=description, remarks=remarks)

        # Assert
        assert sut_res["type"] == "panel_trigger"
        assert sut_res["panel"] == "add_task"
        assert sut_res["initial_data"]["title"] == title
        assert sut_res["initial_data"]["description"] == description
        assert sut_res["initial_data"]["remarks"] == remarks

    async def test_trigger_add_supplier(self):
        # Arrange
        name = "Global Supplier"
        contact_person = "John Doe"
        mobile_number = "9876543210"

        # Act
        sut_res = await trigger_add_supplier(name=name, contact_person=contact_person, mobile_number=mobile_number)

        # Assert
        assert sut_res["type"] == "panel_trigger"
        assert sut_res["panel"] == "add_supplier"
        assert sut_res["initial_data"]["name"] == name
        assert sut_res["initial_data"]["contact_person"] == contact_person
        assert sut_res["initial_data"]["mobile_number"] == mobile_number

    async def test_trigger_add_purchase_order(self):
        # Arrange
        branch_id = 1
        supplier_id = 2
        notes = "Test PO notes"

        # Act
        sut_res = await trigger_add_purchase_order(branch_id=branch_id, supplier_id=supplier_id, notes=notes)

        # Assert
        assert sut_res["type"] == "panel_trigger"
        assert sut_res["panel"] == "add_purchase_order"
        assert sut_res["initial_data"]["branch_id"] == branch_id
        assert sut_res["initial_data"]["supplier_id"] == supplier_id
        assert sut_res["initial_data"]["notes"] == notes

    async def test_trigger_add_sales_order(self):
        # Arrange
        branch_id = 1
        customer_id = 3
        notes = "Test SO notes"

        # Act
        sut_res = await trigger_add_sales_order(branch_id=branch_id, customer_id=customer_id, notes=notes)

        # Assert
        assert sut_res["type"] == "panel_trigger"
        assert sut_res["panel"] == "add_sales_order"
        assert sut_res["initial_data"]["branch_id"] == branch_id
        assert sut_res["initial_data"]["customer_id"] == customer_id
        assert sut_res["initial_data"]["notes"] == notes

    async def test_customer_tools(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.customer import (
            trigger_add_customer,
            trigger_edit_customer,
            search_customers,
        )
        from apps.ai_agent.utils.context import current_user_context
        current_user_context.set({"business_id": 10})

        # Act & Assert - add
        sut_add = await trigger_add_customer(name="Alice", mobile_number="9876543210", gender="female")
        assert sut_add["type"] == "panel_trigger"
        assert sut_add["panel"] == "add_customer"
        assert sut_add["initial_data"]["gender"] == "FEMALE"

        # Act & Assert - search without context
        current_user_context.set({})
        assert await search_customers("Alice") == []

        # Act & Assert - search with context
        current_user_context.set({"business_id": 10})
        with patch("apps.business.models.BusinessCustomer.objects.filter") as mock_filter:
            mock_filter.return_value.filter.return_value.values.return_value = [{"id": 1, "name": "Alice"}]
            sut_search = await search_customers("Alice")
            assert len(sut_search) == 1

        # Act & Assert - edit
        with patch("apps.ai_agent.tools.manage_agent_tools.customer.verify_and_trigger_edit", AsyncMock(return_value={"type": "panel_trigger", "panel": "edit_customer", "id": 1})):
            sut_edit = await trigger_edit_customer(1)
            assert sut_edit["panel"] == "edit_customer"

    async def test_invoice_and_expense_tools(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.invoice import trigger_add_invoice, search_invoices
        from apps.ai_agent.tools.manage_agent_tools.expense import trigger_add_expense, trigger_edit_expense, search_expenses
        from apps.ai_agent.utils.context import current_user_context

        # Act & Assert - add invoice
        sut_inv = await trigger_add_invoice(branch_id=1, customer_name="Bob", payment_mode="cash")
        assert sut_inv["panel"] == "add_invoice"
        assert sut_inv["initial_data"]["payment_mode"] == "CASH"

        # Act & Assert - search invoices without & with context
        current_user_context.set({})
        assert await search_invoices() == []

        current_user_context.set({"business_id": 10})
        with patch("apps.invoice.models.Invoice.objects.filter") as mock_filter:
            mock_inv = MagicMock(id=5, branch_id=1, total_amount=100.0, payment_mode="CASH")
            mock_inv.customer.name = "Bob"
            mock_inv.customer.mobile_number = "12345"
            mock_filter.return_value.filter.return_value.select_related.return_value = [mock_inv]
            sut_search_inv = await search_invoices("Bob")
            assert len(sut_search_inv) == 1

        # Act & Assert - expense
        sut_exp = await trigger_add_expense(title="Office Supplies", amount="50.00")
        assert sut_exp["panel"] == "add_expense"

        with patch("apps.ai_agent.tools.manage_agent_tools.expense.verify_and_trigger_edit", AsyncMock(return_value={"panel": "edit_expense"})):
            sut_edit_exp = await trigger_edit_expense(1)
            assert sut_edit_exp["panel"] == "edit_expense"

        with patch("apps.cost.models.Expense.objects.filter") as mock_exp_filter:
            mock_exp_filter.return_value.values.return_value = [{"id": 1, "title": "Office Supplies", "amount": "50.00", "date": "2026-01-01"}]
            sut_search_exp = await search_expenses("Office")
            assert len(sut_search_exp) == 1

    async def test_report_and_subscription_tools(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.report import trigger_generate_analytics_report
        from apps.ai_agent.tools.manage_agent_tools.subscription import trigger_view_plans, get_active_subscription
        from apps.ai_agent.utils.context import current_user_context

        # Act & Assert - report
        sut_rep = await trigger_generate_analytics_report("2026-01-01", "2026-01-31", "product,cost")
        assert sut_rep["panel"] == "generate_report"
        assert sut_rep["parameters"]["report_types"] == "product,cost"

        # Act & Assert - subscription
        assert (await trigger_view_plans())["panel"] == "view_plans"

        current_user_context.set({})
        assert "error" in await get_active_subscription()

        current_user_context.set({"business_id": 10})
        with patch("apps.subscription.models.Subscription.objects.filter") as mock_sub_filter:
            mock_sub_filter.return_value.order_by.return_value.first.return_value = None
            assert (await get_active_subscription())["active"] is False

            mock_sub = MagicMock(
                plan_name="Pro", price=99.0, duration_days=30,
                start_date=None, end_date=None, max_products=10,
                max_invoices=50, max_staff=5, max_branches=2, is_trial=False
            )
            mock_sub_filter.return_value.order_by.return_value.first.return_value = mock_sub
            sut_active = await get_active_subscription()
            assert sut_active["active"] is True
            assert sut_active["plan_name"] == "Pro"

    async def test_reminder_tools(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.reminder import (
            trigger_add_reminder,
            trigger_edit_reminder,
            search_reminders,
        )
        from apps.ai_agent.utils.context import current_user_context

        # Act & Assert - add
        sut_rem = await trigger_add_reminder(title="Pay Tax", recurrence="MONTHLY")
        assert sut_rem["panel"] == "add_reminder"
        assert sut_rem["initial_data"]["recurrence"] == "MONTHLY"

        # Act & Assert - edit
        with patch("apps.ai_agent.tools.manage_agent_tools.reminder.verify_and_trigger_edit", AsyncMock(return_value={"panel": "edit_reminder"})):
            assert (await trigger_edit_reminder(1))["panel"] == "edit_reminder"

        # Act & Assert - search
        current_user_context.set({})
        assert await search_reminders() == []

        current_user_context.set({"user_id": 5})
        with patch("apps.notification.models.Reminder.objects.filter") as mock_rem_filter:
            mock_rem = MagicMock(id=1, title="Pay Tax", content="Due soon", remind_at=None, recurrence="NONE", is_sent=False)
            mock_rem_filter.return_value.filter.return_value = [mock_rem]
            sut_search = await search_reminders("Tax")
            assert len(sut_search) == 1

    async def test_search_and_edit_for_branch_product_supplier_task(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.branch import trigger_edit_branch, list_branches
        from apps.ai_agent.tools.manage_agent_tools.product import trigger_edit_product, search_products
        from apps.ai_agent.tools.manage_agent_tools.product_category import trigger_edit_product_category, search_product_categories
        from apps.ai_agent.tools.manage_agent_tools.cost_category import trigger_edit_cost_category, search_cost_categories
        from apps.ai_agent.tools.manage_agent_tools.task import trigger_edit_task, search_tasks
        from apps.ai_agent.tools.manage_agent_tools.supplier import (
            trigger_edit_supplier, search_suppliers,
            trigger_edit_purchase_order, search_purchase_orders,
            trigger_edit_sales_order, search_sales_orders,
        )
        from apps.ai_agent.utils.context import current_user_context
        current_user_context.set({"business_id": 10})

        with patch("apps.ai_agent.tools.manage_agent_tools.branch.verify_and_trigger_edit", AsyncMock(return_value={"status": "ok"})), \
             patch("apps.ai_agent.tools.manage_agent_tools.product.verify_and_trigger_edit", AsyncMock(return_value={"status": "ok"})), \
             patch("apps.ai_agent.tools.manage_agent_tools.product_category.verify_and_trigger_edit", AsyncMock(return_value={"status": "ok"})), \
             patch("apps.ai_agent.tools.manage_agent_tools.cost_category.verify_and_trigger_edit", AsyncMock(return_value={"status": "ok"})), \
             patch("apps.ai_agent.tools.manage_agent_tools.task.verify_and_trigger_edit", AsyncMock(return_value={"status": "ok"})), \
             patch("apps.ai_agent.tools.manage_agent_tools.supplier.verify_and_trigger_edit", AsyncMock(return_value={"status": "ok"})):
            assert (await trigger_edit_branch(1))["status"] == "ok"
            assert (await trigger_edit_product(1))["status"] == "ok"
            assert (await trigger_edit_product_category(1))["status"] == "ok"
            assert (await trigger_edit_cost_category(1))["status"] == "ok"
            assert (await trigger_edit_task(1))["status"] == "ok"
            assert (await trigger_edit_supplier(1))["status"] == "ok"
            assert (await trigger_edit_purchase_order(1))["status"] == "ok"
            assert (await trigger_edit_sales_order(1))["status"] == "ok"

        with patch("apps.business.models.Branch.objects.filter") as m_branch, \
             patch("apps.product.models.Product.objects.filter") as m_prod, \
             patch("apps.product.models.ProductCategory.objects.filter") as m_cat, \
             patch("apps.cost.models.CostCategory.objects.filter") as m_cost_cat, \
             patch("apps.tasks.models.Task.objects.filter") as m_task, \
             patch("apps.supplier.models.Supplier.objects.filter") as m_supp, \
             patch("apps.supplier.models.PurchaseOrder.objects.filter") as m_po, \
             patch("apps.supplier.models.SalesOrder.objects.filter") as m_so:

            m_branch.return_value.values.return_value = [{"id": 1, "branch_name": "Main"}]
            m_prod.return_value.values.return_value = [{"id": 1, "name": "P", "sku": "SKU", "base_price": 15.0}]
            m_cat.return_value.values.return_value = [{"id": 1, "name": "Cat"}]
            m_cost_cat.return_value.values.return_value = [{"id": 1, "name": "Cost", "gst_rate": 18.0}]
            m_task.return_value.select_related.return_value.values.return_value = [{"id": 1, "title": "T", "status": "PENDING", "assignee__username": "u"}]
            m_supp.return_value.filter.return_value.values.return_value = [{"id": 1, "name": "Supp"}]
            m_po.return_value.filter.return_value.select_related.return_value = []
            m_so.return_value.filter.return_value.select_related.return_value = []

            assert len(await list_branches()) == 1
            assert len(await search_products("P")) == 1
            assert len(await search_product_categories("Cat")) == 1
            assert len(await search_cost_categories("Cost")) == 1
            assert len(await search_tasks("T")) == 1
            assert len(await search_suppliers("Supp")) == 1
            assert await search_purchase_orders("PO") == []
            assert await search_sales_orders("SO") == []

        # Empty context returns []
        from apps.ai_agent.tools.manage_agent_tools.expense import search_expenses
        current_user_context.set({})
        assert await list_branches() == []
        assert await search_products("P") == []
        assert await search_product_categories("C") == []
        assert await search_cost_categories("C") == []
        assert await search_expenses("E") == []
        assert await search_tasks("T") == []
        assert await search_suppliers("S") == []
        assert await search_purchase_orders("PO") == []
        assert await search_sales_orders("SO") == []

    async def test_assign_task_to_employee(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.assignment import assign_task_to_employee
        from apps.ai_agent.utils.context import current_user_context

        # No context
        current_user_context.set({})
        assert "error" in await assign_task_to_employee("task", "employee")

        # Context present
        current_user_context.set({"business_id": 10})
        with patch("apps.tasks.models.Task.objects.filter") as m_task, \
             patch("apps.user.models.User.objects.filter") as m_user:

            # 1. No tasks found
            m_task.return_value = []
            sut_no_task = await assign_task_to_employee("Fix bug", "John")
            assert "No tasks found" in sut_no_task["error"]

            # 2. Multiple tasks found
            t1 = MagicMock(id=1, title="Fix bug 1")
            t2 = MagicMock(id=2, title="Fix bug 2")
            m_task.return_value = [t1, t2]
            sut_multi_task = await assign_task_to_employee("Fix bug", "John")
            assert "Multiple tasks found" in sut_multi_task["error"]

            # 3. Exactly 1 task, no user
            m_task.return_value = [t1]
            mock_user_qs = MagicMock()
            mock_user_qs.__or__.return_value = []
            m_user.return_value = mock_user_qs
            sut_no_user = await assign_task_to_employee("Fix bug", "John")
            assert "No employees found" in sut_no_user["error"]

            # 4. Exactly 1 task, multiple users found
            u1 = MagicMock(id=10, username="john_doe", email="john@example.com")
            u2 = MagicMock(id=20, username="john_smith", email="smith@example.com")
            mock_user_qs.__or__.return_value = [u1, u2]
            sut_multi_user = await assign_task_to_employee("Fix bug", "John")
            assert "Multiple employees found" in sut_multi_user["error"]

            # 5. Exactly 1 task, 1 user -> success confirmation panel
            mock_user_qs.__or__.return_value = [u1]
            sut_ok = await assign_task_to_employee("Fix bug", "John")
            assert sut_ok["type"] == "confirmation_trigger"
            assert sut_ok["action"]["tool"] == "execute_assignment"
            assert sut_ok["action"]["parameters"]["entity_type"] == "task_employee"

        # 6. Exception handling
        with patch("apps.tasks.models.Task.objects.filter", side_effect=Exception("DB error")):
            sut_err = await assign_task_to_employee("Fix bug", "John")
            assert "DB error" in sut_err["error"]

    async def test_create_reminder_tool(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.reminder import create_reminder, search_reminders
        from apps.ai_agent.utils.context import current_user_context
        from django.utils import timezone
        import datetime

        # 1. No context
        current_user_context.set({})
        sut_no_ctx = await create_reminder("Call client", "2027-01-01T10:00:00")
        assert sut_no_ctx["success"] is False

        # 1b. Search reminders no user_id
        current_user_context.set({"business_id": 10})
        assert await search_reminders() == []

        # 2. No user_id
        current_user_context.set({"business_id": 10})
        sut_no_uid = await create_reminder("Call client", "2027-01-01T10:00:00")
        assert sut_no_uid["success"] is False

        # 3. Time in the past
        current_user_context.set({"user_id": 5, "business_id": 10})
        sut_past = await create_reminder("Call client", "2020-01-01T10:00:00")
        assert sut_past["success"] is False
        assert "in the past" in sut_past["error"]

        # 4. Success flow
        future_str = (timezone.now() + datetime.timedelta(days=2)).isoformat()
        with patch("apps.user.models.User.all_objects.get") as m_user_get, \
             patch("apps.notification.models.Reminder.objects.create") as m_rem_create, \
             patch("apps.notification.tasks.trigger_reminder_task.apply_async") as m_task:
            m_user = MagicMock(id=5)
            m_user_get.return_value = m_user
            mock_rem = MagicMock(id=99, title="Call client")
            m_rem_create.return_value = mock_rem
            m_task.return_value = MagicMock(id="celery-123")

            sut_succ = await create_reminder("Call client", future_str, content="Important call", recurrence="DAILY")
            assert sut_succ["success"] is True
            assert "Call client" in sut_succ["message"]

        # 4b. Invalid recurrence fallback to NONE and parse_datetime returning None fallback
        with patch("django.utils.dateparse.parse_datetime", return_value=None), \
             patch("apps.user.models.User.all_objects.get") as m_u, \
             patch("apps.notification.models.Reminder.objects.create") as m_r:
            m_u.return_value = MagicMock(id=5)
            m_r.return_value = MagicMock(id=100)
            res_rec = await create_reminder("Fallback", future_str, recurrence="UNKNOWN_REC")
            assert res_rec["success"] is True

        # 5. Exception handling
        with patch("apps.user.models.User.all_objects.get", side_effect=Exception("DB down")):
            sut_err = await create_reminder("Call client", future_str)
            assert sut_err["success"] is False
            assert "DB down" in sut_err["error"]

    async def test_link_product_to_category_and_variations(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.assignment import link_product_to_category
        from apps.ai_agent.utils.context import current_user_context

        # No context
        current_user_context.set({})
        assert "error" in await link_product_to_category("Laptop", "Electronics")

        # Context present
        current_user_context.set({"business_id": 10})
        with patch("apps.product.models.Product.objects.filter") as m_p, \
             patch("apps.product.models.ProductCategory.objects.filter") as m_c:

            # 1. No products found
            mock_p_qs = MagicMock()
            mock_p_qs.__or__.return_value = []
            m_p.return_value = mock_p_qs
            res1 = await link_product_to_category("Laptop", "Electronics")
            assert "No products found" in res1["error"]

            # 2. Multiple products found
            p1 = MagicMock(id=1, name="Laptop 1", sku="L1")
            p2 = MagicMock(id=2, name="Laptop 2", sku="L2")
            mock_p_qs.__or__.return_value = [p1, p2]
            res2 = await link_product_to_category("Laptop", "Electronics")
            assert "Multiple products found" in res2["error"]

            # 3. One product, no categories
            mock_p_qs.__or__.return_value = [p1]
            m_c.return_value = []
            res3 = await link_product_to_category("Laptop", "Electronics")
            assert "No product categories found" in res3["error"]

            # 4. One product, multiple categories
            c1 = MagicMock(id=10, name="Cat 1")
            c2 = MagicMock(id=20, name="Cat 2")
            m_c.return_value = [c1, c2]
            res4 = await link_product_to_category("Laptop", "Electronics")
            assert "Multiple categories found" in res4["error"]

            # 5. Success
            m_c.return_value = [c1]
            res5 = await link_product_to_category("Laptop", "Electronics")
            assert res5["type"] == "confirmation_trigger"
            assert res5["action"]["parameters"]["entity_type"] == "product_category"

        # Exception handling
        with patch("apps.product.models.Product.objects.filter", side_effect=Exception("DB err")):
            assert "DB err" in (await link_product_to_category("Laptop", "Electronics"))["error"]

    async def test_link_expense_tools(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.assignment import link_expense_to_cost_category, link_expense_to_branch
        from apps.ai_agent.utils.context import current_user_context

        # No context
        current_user_context.set({})
        assert "error" in await link_expense_to_cost_category("Rent", "Office")
        assert "error" in await link_expense_to_branch("Rent", "Main")

        # Context present
        current_user_context.set({"business_id": 10})
        with patch("apps.cost.models.Expense.objects.filter") as m_exp, \
             patch("apps.cost.models.CostCategory.objects.filter") as m_cat, \
             patch("apps.business.models.Branch.objects.filter") as m_branch:

            # Expense to cost category
            m_exp.return_value = []
            assert "No expenses found" in (await link_expense_to_cost_category("Rent", "Office"))["error"]

            ex1 = MagicMock(id=1, title="Rent 1", amount=100.0)
            ex2 = MagicMock(id=2, title="Rent 2", amount=200.0)
            m_exp.return_value = [ex1, ex2]
            assert "Multiple expenses found" in (await link_expense_to_cost_category("Rent", "Office"))["error"]

            m_exp.return_value = [ex1]
            m_cat.return_value = []
            assert "No cost categories found" in (await link_expense_to_cost_category("Rent", "Office"))["error"]

            cat1 = MagicMock(id=1, name="Office 1")
            cat2 = MagicMock(id=2, name="Office 2")
            m_cat.return_value = [cat1, cat2]
            assert "Multiple cost categories found" in (await link_expense_to_cost_category("Rent", "Office"))["error"]

            m_cat.return_value = [cat1]
            res_succ = await link_expense_to_cost_category("Rent", "Office")
            assert res_succ["type"] == "confirmation_trigger"
            assert res_succ["action"]["parameters"]["entity_type"] == "expense_cost_category"

            # Expense to branch
            m_exp.return_value = []
            assert "No expenses found" in (await link_expense_to_branch("Rent", "Main"))["error"]

            m_exp.return_value = [ex1, ex2]
            assert "Multiple expenses found" in (await link_expense_to_branch("Rent", "Main"))["error"]

            m_exp.return_value = [ex1]
            m_branch.return_value = []
            assert "No branches found" in (await link_expense_to_branch("Rent", "Main"))["error"]

            b1 = MagicMock(id=1, name="Main 1")
            b2 = MagicMock(id=2, name="Main 2")
            m_branch.return_value = [b1, b2]
            assert "Multiple branches found" in (await link_expense_to_branch("Rent", "Main"))["error"]

            m_branch.return_value = [b1]
            res_b_succ = await link_expense_to_branch("Rent", "Main")
            assert res_b_succ["type"] == "confirmation_trigger"
            assert res_b_succ["action"]["parameters"]["entity_type"] == "expense_branch"

        # Exception handling
        with patch("apps.cost.models.Expense.objects.filter", side_effect=Exception("DB err")):
            assert "DB err" in (await link_expense_to_cost_category("Rent", "Office"))["error"]
            assert "DB err" in (await link_expense_to_branch("Rent", "Main"))["error"]

    async def test_execute_assignment(self):
        # Arrange
        from apps.ai_agent.tools.manage_agent_tools.assignment import execute_assignment
        from apps.ai_agent.utils.context import current_user_context

        def mock_s2a(fn, *a, **kw):
            async def _inner(*inner_a, **inner_kw):
                return fn(*inner_a, **inner_kw)
            return _inner

        # No context
        current_user_context.set({})
        assert "error" in await execute_assignment("task_employee", 1, 2)

        from contextlib import nullcontext
        with patch("django.db.transaction.atomic", return_value=nullcontext()), \
             patch("apps.ai_agent.tools.manage_agent_tools.assignment.sync_to_async", side_effect=mock_s2a), \
             patch("apps.business.models.Business.objects.filter") as m_b_filter:
            m_b_filter.return_value.first.return_value = MagicMock(id=10)

            # Invalid entity type
            current_user_context.set({"business_id": 10})
            res_inv = await execute_assignment("invalid_type", 1, 2)
            assert "Invalid entity_type" in res_inv["error"]

            # task_employee
            with patch("apps.ai_agent.tools.manage_agent_tools.assignment.Task.objects.get") as m_t_get, \
                 patch("apps.ai_agent.tools.manage_agent_tools.assignment.User.objects.get") as m_u_get, \
                 patch("apps.ai_agent.tools.manage_agent_tools.assignment.TaskSerializer") as m_t_ser:
                m_t_get.return_value = MagicMock(id=1, title="Task1")
                m_u_get.return_value = MagicMock(id=2, username="User2")
                m_t_ser.return_value.is_valid.return_value = True
                m_t_ser.return_value.save.return_value = None

                res_task = await execute_assignment("task_employee", 1, 2)
                assert res_task["success"] is True

            # product_category
            with patch("apps.ai_agent.tools.manage_agent_tools.assignment.Product.objects.get") as m_p_get, \
                 patch("apps.ai_agent.tools.manage_agent_tools.assignment.ProductCategory.objects.get") as m_c_get, \
                 patch("apps.ai_agent.tools.manage_agent_tools.assignment.ProductSerializer") as m_p_ser:
                m_p_get.return_value = MagicMock(id=1, name="Product1")
                m_c_get.return_value = MagicMock(id=2, name="Cat1")
                m_p_ser.return_value.is_valid.return_value = True
                m_p_ser.return_value.save.return_value = None

                res_prod = await execute_assignment("product_category", 1, 2)
                assert res_prod["success"] is True

            # expense_cost_category
            with patch("apps.ai_agent.tools.manage_agent_tools.assignment.Expense.objects.get") as m_e_get, \
                 patch("apps.ai_agent.tools.manage_agent_tools.assignment.CostCategory.objects.get") as m_cc_get, \
                 patch("apps.ai_agent.tools.manage_agent_tools.assignment.ExpenseSerializer") as m_e_ser:
                m_e_get.return_value = MagicMock(id=1, title="Expense1")
                m_cc_get.return_value = MagicMock(id=2, name="Cat1")
                m_e_ser.return_value.is_valid.return_value = True
                m_e_ser.return_value.save.return_value = None

                res_exp = await execute_assignment("expense_cost_category", 1, 2)
                assert res_exp["success"] is True

            # expense_branch
            with patch("apps.ai_agent.tools.manage_agent_tools.assignment.Expense.objects.get") as m_e_get, \
                 patch("apps.ai_agent.tools.manage_agent_tools.assignment.Branch.objects.get") as m_b_get, \
                 patch("apps.ai_agent.tools.manage_agent_tools.assignment.ExpenseSerializer") as m_e_ser:
                m_e_get.return_value = MagicMock(id=1, title="Expense1")
                m_b_get.return_value = MagicMock(id=2, name="Branch1")
                m_e_ser.return_value.is_valid.return_value = True
                m_e_ser.return_value.save.return_value = None

                res_b = await execute_assignment("expense_branch", 1, 2)
                assert res_b["success"] is True

            # Exception
            with patch("apps.ai_agent.tools.manage_agent_tools.assignment.Task.objects.get", side_effect=Exception("Task not found")):
                res_ex = await execute_assignment("task_employee", 999, 2)
                assert "Task not found" in res_ex["error"]



