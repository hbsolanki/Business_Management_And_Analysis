import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch
import pytest
from rest_framework import serializers

from apps.business.models import Business, Branch, BusinessCustomer
from apps.product.models import Product, ProductCategory
from apps.supplier.models import Supplier, PurchaseOrder, PurchaseOrderItem, SalesOrder, SalesOrderItem, OrderStatus
from apps.supplier.serializers.purchase_order import PurchaseOrderSerializer, PurchaseOrderItemSerializer
from apps.supplier.serializers.sales_order import SalesOrderSerializer, SalesOrderItemSerializer
from apps.base.models import GST


@pytest.mark.django_db
class TestOrderSerializersExtended:

    @pytest.fixture
    def setup_po_so_env(self):
        biz = Business.objects.create(name="Order Serializer Biz")
        branch1 = Branch.objects.create(business=biz, name="Branch 1")
        branch2 = Branch.objects.create(business=biz, name="Branch 2")
        cat = ProductCategory.objects.create(business=biz, name="Gadgets")
        prod1 = Product.objects.create(
            business=biz, product_category=cat, name="Widget 1", sku="W-001",
            cost_price=Decimal("10.00"), base_price=Decimal("20.00"),
            input_gst_rate=Decimal("18.00"), output_gst_rate=Decimal("18.00")
        )
        prod2 = Product.objects.create(
            business=biz, product_category=cat, name="Widget 2", sku="W-002",
            cost_price=Decimal("15.00"), base_price=Decimal("25.00"),
            input_gst_rate=Decimal("12.00"), output_gst_rate=Decimal("12.00")
        )
        supplier = Supplier.objects.create(business=biz, name="Tech Supplier", contact_person="John", mobile_number="1234567890")
        customer = BusinessCustomer.objects.create(business=biz, name="Jane Customer", mobile_number="9876543210")

        return {
            "business": biz,
            "branch1": branch1,
            "branch2": branch2,
            "product1": prod1,
            "product2": prod2,
            "supplier": supplier,
            "customer": customer,
        }

    # ======================== Purchase Order Item Serializer ========================

    def test_purchase_order_item_serializer_update(self, setup_po_so_env):
        # Arrange
        env = setup_po_so_env
        po1 = PurchaseOrder.objects.create(business=env["business"], branch=env["branch1"], supplier=env["supplier"])
        po2 = PurchaseOrder.objects.create(business=env["business"], branch=env["branch1"], supplier=env["supplier"])
        gst_obj = GST.objects.create(gst_rate=Decimal("18.00"), gst_amount=Decimal("18.00"), total_amount=Decimal("118.00"))
        item_with_gst = PurchaseOrderItem.objects.create(
            purchase_order=po1, product=env["product1"], quantity=2, price=Decimal("10.00"), subtotal=Decimal("20.00"), gst=gst_obj
        )
        item_no_gst = PurchaseOrderItem.objects.create(
            purchase_order=po2, product=env["product1"], quantity=1, price=Decimal("10.00"), subtotal=Decimal("10.00"), gst=None
        )

        ser = PurchaseOrderItemSerializer()

        # Act - update with existing GST
        sut_updated1 = ser.update(item_with_gst, {"quantity": 5, "price": Decimal("12.00"), "product_id": env["product2"]})
        assert sut_updated1.quantity == 5
        assert sut_updated1.product == env["product2"]
        assert sut_updated1.subtotal == Decimal("60.00")
        assert sut_updated1.gst.gst_rate == Decimal("12.00")

        # Act - update when item has no GST initially
        sut_updated2 = ser.update(item_no_gst, {"quantity": 3, "price": Decimal("15.00")})
        assert sut_updated2.quantity == 3
        assert sut_updated2.gst is not None
        assert sut_updated2.subtotal == Decimal("45.00")

    # ======================== Purchase Order Serializer ========================

    def test_purchase_order_validate_items_and_supplier(self, setup_po_so_env):
        env = setup_po_so_env
        context = {"business": env["business"]}

        # 1. Empty items
        ser = PurchaseOrderSerializer(context=context)
        with pytest.raises(serializers.ValidationError) as exc_empty:
            ser.validate_items([])
        assert "at least one item" in str(exc_empty.value).lower()

        # 2. Duplicate products validation
        with pytest.raises(serializers.ValidationError) as exc1:
            ser.validate_items([
                {"product_id": env["product1"].id, "quantity": 1, "price": 10},
                {"product_id": env["product1"].id, "quantity": 2, "price": 10},
            ])
        assert "duplicate" in str(exc1.value).lower()

        # 3. Supplier belonging to different business
        other_biz = Business.objects.create(name="Other Biz")
        other_supplier = Supplier.objects.create(business=other_biz, name="Other Supp", contact_person="P", mobile_number="111")
        with pytest.raises(serializers.ValidationError) as exc2:
            ser.validate_supplier_id(other_supplier)
        assert "invalid" in str(exc2.value).lower()

    def test_purchase_order_create_delivered_status_triggers_gst(self, setup_po_so_env):
        env = setup_po_so_env
        mock_user = MagicMock(business=env["business"], is_authenticated=True)
        data = {
            "supplier_id": env["supplier"].id,
            "branch_id": env["branch1"].id,
            "status": OrderStatus.DELIVERED,
            "notes": "Delivered direct PO",
            "items": [{"product_id": env["product1"].id, "quantity": 10, "price": Decimal("10.00")}],
        }
        ser = PurchaseOrderSerializer(data=data, context={"request": MagicMock(user=mock_user)})
        assert ser.is_valid(), ser.errors

        # Test GST task call and exception handling
        with patch("apps.gst_management.tasks.update_gst_summary_task.delay", side_effect=ValueError("Queue error")):
            sut_po = ser.save()
            assert sut_po.status == OrderStatus.DELIVERED

    def test_purchase_order_update_full_lifecycle_and_inventory(self, setup_po_so_env):
        env = setup_po_so_env
        mock_user = MagicMock(business=env["business"], is_authenticated=True)
        po = PurchaseOrder.objects.create(
            business=env["business"],
            branch=env["branch1"],
            supplier=env["supplier"],
            status=OrderStatus.DELIVERED,
            received_at=datetime.date(2026, 3, 10),
            notes="Initial notes"
        )
        item1 = PurchaseOrderItem.objects.create(
            purchase_order=po, product=env["product1"], quantity=10, price=Decimal("10.00"), subtotal=Decimal("100.00")
        )
        item2 = PurchaseOrderItem.objects.create(
            purchase_order=po, product=env["product2"], quantity=5, price=Decimal("20.00"), subtotal=Decimal("100.00")
        )

        update_data = {
            "branch_id": env["branch2"].id,
            "supplier_id": env["supplier"].id,
            "status": OrderStatus.CONFIRMED,
            "items": [
                # Existing item updated
                {"id": item1.id, "product_id": env["product1"].id, "quantity": 12, "price": Decimal("10.00")},
                # New item created (item2 is omitted so it should be deleted!)
                {"product_id": env["product2"].id, "quantity": 2, "price": Decimal("15.00")},
            ]
        }
        ser = PurchaseOrderSerializer(instance=po, data=update_data, context={"request": MagicMock(user=mock_user)}, partial=True)
        assert ser.is_valid(), ser.errors

        with patch.object(PurchaseOrderSerializer, "_update_delivered_order_inventory") as mock_inv, \
             patch("apps.supplier.tasks.purchase_order_tasks.synchronize_purchase_order_status_update_to_supplier_task.delay"), \
             patch("apps.supplier.tasks.purchase_order_tasks.synchronize_purchase_order_items_update_to_supplier_task.delay"):
            sut_updated = ser.save()

            # Item 2 deleted
            assert po.items.filter(id=item2.id).count() == 0
            # Total items is now 2 (item 1 and new item)
            assert po.items.count() == 2
            # Reversal method called because previously DELIVERED
            mock_inv.assert_called_once()

    def test_purchase_order_update_delivered_with_month_change(self, setup_po_so_env):
        env = setup_po_so_env
        mock_user = MagicMock(business=env["business"], is_authenticated=True)
        po = PurchaseOrder.objects.create(
            business=env["business"],
            branch=env["branch1"],
            supplier=env["supplier"],
            status=OrderStatus.DELIVERED,
            received_at=datetime.date(2026, 1, 15)
        )

        po.received_at = datetime.datetime(2026, 1, 15, 12, 0, tzinfo=datetime.timezone.utc)
        po.save()

        ser = PurchaseOrderSerializer(
            instance=po,
            data={"notes": "Updated note"},
            context={"request": MagicMock(user=mock_user)},
            partial=True
        )
        assert ser.is_valid(), ser.errors

        # Simulate received_at change in delivered order
        with patch("django.db.transaction.on_commit", side_effect=lambda fn: fn()), \
             patch("apps.gst_management.tasks.update_gst_summary_task.delay") as mock_gst:
            new_date = datetime.datetime(2026, 4, 20, 12, 0, tzinfo=datetime.timezone.utc)
            sut_po = ser.save(received_at=new_date)
            assert sut_po.status == OrderStatus.DELIVERED
            # Both current (April) and old (January) months queued
            assert mock_gst.call_count == 2

    # ======================== Sales Order Item Serializer ========================

    def test_sales_order_item_serializer_validation_and_update(self, setup_po_so_env):
        env = setup_po_so_env

        # 1. Missing SKU on creation
        ser = SalesOrderItemSerializer(context={"business": env["business"]})
        with pytest.raises(serializers.ValidationError) as exc1:
            ser.validate({})
        assert "sku" in str(exc1.value).lower()

        # 2. Missing business context
        ser_no_biz = SalesOrderItemSerializer(context={})
        with pytest.raises(serializers.ValidationError) as exc2:
            ser_no_biz.validate({"sku": "W-001"})
        assert "business" in str(exc2.value).lower()

        # 3. Nonexistent SKU
        with pytest.raises(serializers.ValidationError) as exc3:
            ser.validate({"sku": "DOES_NOT_EXIST"})
        assert "not found" in str(exc3.value).lower()

        # 4. Valid item update with existing GST
        so = SalesOrder.objects.create(business=env["business"], branch=env["branch1"], customer=env["customer"])
        gst_obj = GST.objects.create(gst_rate=Decimal("18.00"), gst_amount=Decimal("18.00"), total_amount=Decimal("118.00"))
        so_item = SalesOrderItem.objects.create(
            sales_order=so, product=env["product1"], quantity=2, price=Decimal("20.00"), subtotal=Decimal("40.00"), gst=gst_obj
        )

        sut_updated = ser.update(so_item, {"quantity": 4, "price": Decimal("25.00"), "product_id": env["product2"]})
        assert sut_updated.quantity == 4
        assert sut_updated.product == env["product2"]
        assert sut_updated.subtotal == Decimal("100.00")

        # 5. Valid item update when item has no GST initially
        so2 = SalesOrder.objects.create(business=env["business"], branch=env["branch1"], customer=env["customer"])
        so_item_nogst = SalesOrderItem.objects.create(
            sales_order=so2, product=env["product2"], quantity=1, price=Decimal("10.00"), subtotal=Decimal("10.00"), gst=None
        )
        sut_nogst_updated = ser.update(so_item_nogst, {"quantity": 3, "price": Decimal("15.00")})
        assert sut_nogst_updated.quantity == 3
        assert sut_nogst_updated.gst is not None

    # ======================== Sales Order Serializer ========================

    def test_sales_order_validate_items_and_customer(self, setup_po_so_env):
        env = setup_po_so_env
        context = {"business": env["business"]}

        ser = SalesOrderSerializer(context=context)

        # 1. Empty items
        with pytest.raises(serializers.ValidationError) as exc_empty:
            ser.validate_items([])
        assert "at least one item" in str(exc_empty.value).lower()

        # 2. Duplicate products in items
        with pytest.raises(serializers.ValidationError) as exc1:
            ser.validate_items([
                {"sku": "W-001", "quantity": 1, "price": 10},
                {"sku": "W-001", "quantity": 2, "price": 10},
            ])
        assert "duplicate" in str(exc1.value).lower()

        # 2. Customer from other business
        other_biz = Business.objects.create(name="Other Biz")
        other_cust = BusinessCustomer.objects.create(business=other_biz, name="Other C", mobile_number="222")
        with pytest.raises(serializers.ValidationError) as exc2:
            ser.validate_customer_id(other_cust)
        assert "invalid" in str(exc2.value).lower()

    def test_sales_order_create_triggers_sync(self, setup_po_so_env):
        env = setup_po_so_env
        mock_user = MagicMock(business=env["business"], is_authenticated=True)
        data = {
            "customer_id": env["customer"].id,
            "branch_id": env["branch1"].id,
            "status": OrderStatus.PENDING,
            "notes": "Direct SO",
            "items": [{"sku": env["product1"].sku, "quantity": 5, "price": Decimal("20.00")}],
        }
        ser = SalesOrderSerializer(data=data, context={"request": MagicMock(user=mock_user)})
        assert ser.is_valid(), ser.errors

        with patch("apps.supplier.tasks.sales_order_tasks.synchronize_sales_order_to_customer_task.delay"):
            sut_so = ser.save()
            assert sut_so.status == OrderStatus.PENDING
            assert sut_so.id is not None

    def test_sales_order_update_full_lifecycle_and_inventory(self, setup_po_so_env):
        env = setup_po_so_env
        mock_user = MagicMock(business=env["business"], is_authenticated=True)
        so = SalesOrder.objects.create(
            business=env["business"],
            branch=env["branch1"],
            customer=env["customer"],
            status=OrderStatus.DELIVERED,
            notes="Initial SO notes"
        )
        item1 = SalesOrderItem.objects.create(
            sales_order=so, product=env["product1"], quantity=5, price=Decimal("20.00"), subtotal=Decimal("100.00")
        )
        item2 = SalesOrderItem.objects.create(
            sales_order=so, product=env["product2"], quantity=2, price=Decimal("30.00"), subtotal=Decimal("60.00")
        )

        update_data = {
            "branch_id": env["branch2"].id,
            "customer_id": env["customer"].id,
            "status": OrderStatus.CONFIRMED,
            "items": [
                {"id": item1.id, "sku": env["product1"].sku, "quantity": 8, "price": Decimal("20.00")},
                {"sku": env["product2"].sku, "quantity": 3, "price": Decimal("25.00")},
            ]
        }
        ser = SalesOrderSerializer(instance=so, data=update_data, context={"request": MagicMock(user=mock_user)}, partial=True)
        assert ser.is_valid(), ser.errors

        with patch.object(SalesOrderSerializer, "_update_delivered_order_inventory") as mock_inv, \
             patch("apps.supplier.tasks.sales_order_tasks.synchronize_purchase_order_status_update_to_customer_task.delay"), \
             patch("apps.supplier.tasks.sales_order_tasks.synchronize_sales_order_items_update_to_customer_task.delay"):
            sut_updated = ser.save()

            assert so.items.filter(id=item2.id).count() == 0
            assert so.items.count() == 2
            mock_inv.assert_called_once()

    def test_direct_update_delivered_order_inventory_invocations(self, setup_po_so_env):
        env = setup_po_so_env
        po = PurchaseOrder.objects.create(business=env["business"], branch=env["branch1"], supplier=env["supplier"])
        so = SalesOrder.objects.create(business=env["business"], branch=env["branch1"], customer=env["customer"])

        with patch("apps.supplier.serializers.purchase_order.resync_order_inventory") as m_resync_po, \
             patch("apps.supplier.serializers.sales_order.resync_order_inventory") as m_resync_so:
            PurchaseOrderSerializer(context={"request": None})._update_delivered_order_inventory(po, [], None)
            m_resync_po.assert_called_once()

            SalesOrderSerializer(context={"request": None})._update_delivered_order_inventory(so, [], None)
            m_resync_so.assert_called_once()
