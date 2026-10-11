from decimal import Decimal
from unittest.mock import MagicMock, patch
import pytest

from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product, ProductCategory
from apps.supplier.models import Supplier, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem, OrderStatus
from apps.user.models import User
from apps.employee.models import UserBusinessRole, UserRole
from apps.supplier.tasks.purchase_order_tasks import (
    synchronize_purchase_order_to_supplier_task,
    synchronize_purchase_order_status_update_to_supplier_task,
    synchronize_purchase_order_items_update_to_supplier_task,
)
from apps.supplier.tasks.sales_order_tasks import (
    synchronize_sales_order_to_customer_task,
    synchronize_purchase_order_status_update_to_customer_task,
    synchronize_sales_order_items_update_to_customer_task,
)


@pytest.mark.django_db
class TestSupplierTasksExtended:

    @pytest.fixture
    def setup_tasks_env(self):
        biz_a = Business.objects.create(name="Business A")
        biz_b = Business.objects.create(name="Business B")

        user_a = User.objects.create(username="owner_a", email="a@example.com")
        user_b = User.objects.create(username="owner_b", email="b@example.com")

        UserBusinessRole.objects.create(user=user_a, business=biz_a, role=UserRole.OWNER)
        UserBusinessRole.objects.create(user=user_b, business=biz_b, role=UserRole.OWNER)

        branch_a = Branch.objects.create(business=biz_a, name="Branch A")
        branch_b = Branch.objects.create(business=biz_b, name="Branch B")

        cat_a = ProductCategory.objects.create(business=biz_a, name="Gadgets A")
        cat_b = ProductCategory.objects.create(business=biz_b, name="Gadgets B")

        prod_a1 = Product.objects.create(
            business=biz_a, product_category=cat_a, name="Shared Widget", sku="SHARED-01",
            cost_price=Decimal("10.00"), base_price=Decimal("20.00"),
            input_gst_rate=Decimal("18.00"), output_gst_rate=Decimal("18.00")
        )
        prod_b1 = Product.objects.create(
            business=biz_b, product_category=cat_b, name="Shared Widget", sku="SHARED-01",
            cost_price=Decimal("10.00"), base_price=Decimal("20.00"),
            input_gst_rate=Decimal("18.00"), output_gst_rate=Decimal("18.00")
        )
        prod_a_only = Product.objects.create(
            business=biz_a, product_category=cat_a, name="Exclusive A", sku="EXCL-A",
            cost_price=Decimal("10.00"), base_price=Decimal("20.00"),
            input_gst_rate=Decimal("18.00"), output_gst_rate=Decimal("18.00")
        )

        supp_a = Supplier.objects.create(
            business=biz_a, supplier_business=biz_b, name="Supplier B", mobile_number="1111111111", same_platform=True
        )
        supp_b = Supplier.objects.create(
            business=biz_b, supplier_business=biz_a, name="Supplier A", mobile_number="2222222222", same_platform=True
        )

        cust_b = BusinessCustomer.objects.create(
            business=biz_b, customer_business=biz_a, name="Customer A", mobile_number="3333333333", same_platform=True
        )
        cust_a = BusinessCustomer.objects.create(
            business=biz_a, customer_business=biz_b, name="Customer B", mobile_number="4444444444", same_platform=True
        )

        return {
            "biz_a": biz_a, "biz_b": biz_b,
            "branch_a": branch_a, "branch_b": branch_b,
            "prod_a1": prod_a1, "prod_b1": prod_b1, "prod_a_only": prod_a_only,
            "supp_a": supp_a, "supp_b": supp_b,
            "cust_a": cust_a, "cust_b": cust_b,
        }

    # ======================== Purchase Order Tasks Edge Cases ========================

    def test_po_task_not_found(self):
        # Should not raise exception
        synchronize_purchase_order_to_supplier_task(999999)
        synchronize_purchase_order_status_update_to_supplier_task(999999)
        synchronize_purchase_order_items_update_to_supplier_task(999999)

    def test_po_task_skipped_if_so_already_exists(self, setup_tasks_env):
        env = setup_tasks_env
        po = PurchaseOrder.objects.create(business=env["biz_a"], branch=env["branch_a"], supplier=env["supp_a"])
        so = SalesOrder.objects.create(business=env["biz_b"], purchase_order=po)

        # Act
        with patch("apps.supplier.models.SalesOrder.objects.create") as m_so_create:
            synchronize_purchase_order_to_supplier_task(po.id)
            m_so_create.assert_not_called()

    def test_po_task_same_platform_no_supplier_business(self, setup_tasks_env):
        env = setup_tasks_env
        orphan_supp = Supplier.objects.create(business=env["biz_a"], name="Orphan", mobile_number="555", same_platform=True, supplier_business=None)
        po = PurchaseOrder.objects.create(business=env["biz_a"], branch=env["branch_a"], supplier=orphan_supp)

        synchronize_purchase_order_to_supplier_task(po.id)
        po.refresh_from_db()
        assert po.status == OrderStatus.FAILED
        assert "no supplier_business linked" in po.notes

    def test_po_task_no_customer_in_target_business(self, setup_tasks_env):
        env = setup_tasks_env
        env["cust_b"].delete()
        po = PurchaseOrder.objects.create(business=env["biz_a"], branch=env["branch_a"], supplier=env["supp_a"])

        synchronize_purchase_order_to_supplier_task(po.id)
        po.refresh_from_db()
        assert po.status == OrderStatus.FAILED
        assert "No BusinessCustomer found" in po.notes

    def test_po_task_unmapped_item_notification(self, setup_tasks_env):
        env = setup_tasks_env
        po = PurchaseOrder.objects.create(business=env["biz_a"], branch=env["branch_a"], supplier=env["supp_a"])
        # Add shared widget and unmapped widget
        PurchaseOrderItem.objects.create(purchase_order=po, product=env["prod_a1"], quantity=5, price=Decimal("10.00"), subtotal=Decimal("50.00"))
        PurchaseOrderItem.objects.create(purchase_order=po, product=env["prod_a_only"], quantity=2, price=Decimal("20.00"), subtotal=Decimal("40.00"))

        with patch("apps.supplier.tasks.purchase_order_tasks.send_notification") as mock_notif, \
             patch("apps.supplier.serializers.sales_order.SalesOrderSerializer.save") as mock_save:
            mock_so = MagicMock(id=77)
            mock_save.return_value = mock_so

            synchronize_purchase_order_to_supplier_task(po.id)
            # Notification sent for unmapped item
            assert mock_notif.call_count >= 2

    def test_po_task_all_items_unmapped_skips_so(self, setup_tasks_env):
        env = setup_tasks_env
        po = PurchaseOrder.objects.create(business=env["biz_a"], branch=env["branch_a"], supplier=env["supp_a"])
        PurchaseOrderItem.objects.create(purchase_order=po, product=env["prod_a_only"], quantity=2, price=Decimal("20.00"), subtotal=Decimal("40.00"))

        with patch("apps.supplier.serializers.sales_order.SalesOrderSerializer.save") as mock_save:
            synchronize_purchase_order_to_supplier_task(po.id)
            mock_save.assert_not_called()

    def test_po_status_task_delivered_inventory_update(self, setup_tasks_env):
        env = setup_tasks_env
        po = PurchaseOrder.objects.create(business=env["biz_a"], branch=env["branch_a"], supplier=env["supp_a"], status=OrderStatus.DELIVERED)
        so = SalesOrder.objects.create(business=env["biz_b"], branch=env["branch_b"], status=OrderStatus.PENDING, purchase_order=po)

        with patch("apps.supplier.utils.update_purchase_order_inventory_stock") as mock_inv_stock, \
             patch("apps.notification.utils.send_notification"):
            synchronize_purchase_order_status_update_to_supplier_task(po.id)
            so.refresh_from_db()
            assert so.status == OrderStatus.DELIVERED
            mock_inv_stock.assert_called_once_with(sales_order=so, action="OUT")

    def test_po_items_update_delete_and_unmapped(self, setup_tasks_env):
        env = setup_tasks_env
        po = PurchaseOrder.objects.create(business=env["biz_a"], branch=env["branch_a"], supplier=env["supp_a"])
        po_item = PurchaseOrderItem.objects.create(purchase_order=po, product=env["prod_a1"], quantity=15, price=Decimal("10.00"), subtotal=Decimal("150.00"))

        so = SalesOrder.objects.create(business=env["biz_b"], branch=env["branch_b"], purchase_order=po)
        # Old item in SO that was deleted from PO
        old_so_item = SalesOrderItem.objects.create(sales_order=so, product=env["prod_b1"], quantity=3, price=Decimal("10.00"), subtotal=Decimal("30.00"))

        with patch("apps.notification.utils.send_notification"):
            synchronize_purchase_order_items_update_to_supplier_task(po.id)
            so.refresh_from_db()
            assert so.items.count() == 1
            assert so.items.first().quantity == 15

    # ======================== Sales Order Tasks Edge Cases ========================

    def test_so_task_not_found(self):
        synchronize_sales_order_to_customer_task(999999)
        synchronize_purchase_order_status_update_to_customer_task(999999)
        synchronize_sales_order_items_update_to_customer_task(999999)

    def test_so_task_same_platform_no_customer_business(self, setup_tasks_env):
        env = setup_tasks_env
        orphan_cust = BusinessCustomer.objects.create(business=env["biz_b"], name="Orphan C", mobile_number="999", same_platform=True, customer_business=None)
        so = SalesOrder.objects.create(business=env["biz_b"], customer=orphan_cust)

        # Should log and return gracefully
        synchronize_sales_order_to_customer_task(so.id)

    def test_so_task_no_reciprocal_supplier(self, setup_tasks_env):
        env = setup_tasks_env
        env["supp_a"].delete()
        so = SalesOrder.objects.create(business=env["biz_b"], customer=env["cust_b"])

        # Should log error and return gracefully
        synchronize_sales_order_to_customer_task(so.id)

    def test_so_task_unmapped_item_notifications(self, setup_tasks_env):
        env = setup_tasks_env
        so = SalesOrder.objects.create(business=env["biz_b"], customer=env["cust_b"])
        SalesOrderItem.objects.create(sales_order=so, product=env["prod_b1"], quantity=5, price=Decimal("20.00"), subtotal=Decimal("100.00"))
        # Unmapped product in business B
        prod_b_only = Product.objects.create(
            business=env["biz_b"], product_category=env["prod_b1"].product_category, name="Exclusive B", sku="EXCL-B",
            cost_price=Decimal("10.00"), base_price=Decimal("20.00"), input_gst_rate=Decimal("18.00"), output_gst_rate=Decimal("18.00")
        )
        SalesOrderItem.objects.create(sales_order=so, product=prod_b_only, quantity=2, price=Decimal("15.00"), subtotal=Decimal("30.00"))

        with patch("apps.supplier.tasks.sales_order_tasks.send_notification") as mock_notif, \
             patch("apps.supplier.serializers.purchase_order.PurchaseOrderSerializer.save") as mock_save:
            mock_po = MagicMock(id=88)
            mock_save.return_value = mock_po

            synchronize_sales_order_to_customer_task(so.id)
            assert mock_notif.call_count >= 2

    def test_so_status_update_delivered_inventory_update(self, setup_tasks_env):
        env = setup_tasks_env
        so = SalesOrder.objects.create(business=env["biz_b"], branch=env["branch_b"], customer=env["cust_b"], status=OrderStatus.DELIVERED)
        po = PurchaseOrder.objects.create(business=env["biz_a"], branch=env["branch_a"], supplier=env["supp_a"], status=OrderStatus.PENDING)
        so.purchase_order = po
        so.save()

        with patch("apps.supplier.utils.update_purchase_order_inventory_stock") as mock_inv, \
             patch("apps.notification.utils.send_notification"):
            synchronize_purchase_order_status_update_to_customer_task(so.id)
            po.refresh_from_db()
            assert po.status == OrderStatus.DELIVERED
            mock_inv.assert_called_once_with(purchase_order=po, action="IN")

    def test_so_items_update_sync_to_po(self, setup_tasks_env):
        env = setup_tasks_env
        po = PurchaseOrder.objects.create(business=env["biz_a"], branch=env["branch_a"], supplier=env["supp_a"])
        so = SalesOrder.objects.create(business=env["biz_b"], branch=env["branch_b"], customer=env["cust_b"], purchase_order=po)

        SalesOrderItem.objects.create(sales_order=so, product=env["prod_b1"], quantity=10, price=Decimal("20.00"), subtotal=Decimal("200.00"))
        # Old item in PO that gets deleted
        PurchaseOrderItem.objects.create(purchase_order=po, product=env["prod_a_only"], quantity=1, price=Decimal("10.00"), subtotal=Decimal("10.00"))

        with patch("apps.notification.utils.send_notification"):
            synchronize_sales_order_items_update_to_customer_task(so.id)
            po.refresh_from_db()
            assert po.items.count() == 1
            assert po.items.first().quantity == 10
