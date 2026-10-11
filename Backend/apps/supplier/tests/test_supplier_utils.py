import pytest
from unittest.mock import patch, MagicMock
from decimal import Decimal
from apps.base.tests import BaseTestCase
from apps.supplier.models import OrderStatus
from apps.supplier.utils.integration_service import (
    push_purchase_order_to_supplier_external_api,
    push_purchase_order_status_to_supplier_external_api,
    push_sales_order_status_to_customer_external_api,
)
from apps.supplier.utils.sales_order_inventory import update_sales_order_inventory_stock
from apps.supplier.utils.inventory_service import reverse_order_inventory, resync_order_inventory


@pytest.fixture
def supplier_util_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestSupplierUtils:

    def test_push_purchase_order_inactive_supplier(self, supplier_util_env):
        """Test PO sync skipped when supplier has no API or is inactive."""
        # Arrange
        sut_po = supplier_util_env.po_a1
        sut_po.supplier.integration_active = False
        sut_po.supplier.save()

        # Act
        result = push_purchase_order_to_supplier_external_api(sut_po)

        # Assert
        assert result is None

    @patch("requests.post")
    def test_push_purchase_order_success(self, mock_post, supplier_util_env):
        """Test PO sync success response."""
        # Arrange
        sut_po = supplier_util_env.po_a1
        sut_po.supplier.integration_active = True
        sut_po.supplier.api_url = "https://supplier.example.com/api/orders"
        sut_po.supplier.api_key = "secret_key"
        sut_po.supplier.save()

        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_post.return_value = mock_response

        # Act
        result = push_purchase_order_to_supplier_external_api(sut_po)

        # Assert
        assert result is True
        assert mock_post.called

    @patch("requests.post")
    def test_push_purchase_order_failure_raises(self, mock_post, supplier_util_env):
        """Test PO sync failure raises RuntimeError."""
        # Arrange
        sut_po = supplier_util_env.po_a1
        sut_po.supplier.integration_active = True
        sut_po.supplier.api_url = "https://supplier.example.com/api/orders"
        sut_po.supplier.save()

        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response

        # Act & Assert
        with pytest.raises(RuntimeError):
            push_purchase_order_to_supplier_external_api(sut_po)

    def test_push_status_functions(self, supplier_util_env):
        """Test push status helper functions."""
        # Arrange
        sut_po = supplier_util_env.po_a1
        sut_so = supplier_util_env.so_a1

        # Act & Assert
        assert push_purchase_order_status_to_supplier_external_api(sut_po, OrderStatus.DELIVERED) is False
        assert push_sales_order_status_to_customer_external_api(sut_so, OrderStatus.DELIVERED) is False

    def test_update_sales_order_inventory_stock(self, supplier_util_env):
        """Test updating inventory stock when Sales Order is delivered."""
        # Arrange
        sut_so = supplier_util_env.so_a1

        # Act
        result = update_sales_order_inventory_stock(sut_so)

        # Assert
        assert result is True

    def test_reverse_and_resync_order_inventory(self, supplier_util_env):
        """Test reversing and resyncing order inventory."""
        # Arrange
        sut_so = supplier_util_env.so_a1
        old_items = [{"product_id": supplier_util_env.product_a1.id, "quantity": 2}]
        old_branch = supplier_util_env.branch_a1

        # Act (reverse with empty old_items)
        reverse_order_inventory(sut_so, [], old_branch, "IN", "SO", None)

        # Act (reverse with valid items)
        reverse_order_inventory(sut_so, old_items, old_branch, "IN", "SO", None)

        # Act (resync when status is not DELIVERED)
        sut_so.status = OrderStatus.PENDING
        sut_so.save()
        resync_order_inventory(sut_so, old_items, old_branch, "IN", "OUT", "SO", None)

        # Act (resync when status IS DELIVERED)
        sut_so.status = OrderStatus.DELIVERED
        sut_so.save()
        resync_order_inventory(sut_so, old_items, old_branch, "IN", "OUT", "SO", None)
