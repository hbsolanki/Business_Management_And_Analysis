import pytest
from unittest.mock import MagicMock, patch

from apps.inventory.signals import check_low_stock
from apps.inventory.models import InventoryProduct


class TestInventorySignals:

    def test_check_low_stock_above_limit(self):
        # Arrange
        prod = MagicMock(low_stock_limit=10)
        inv_prod = MagicMock(product=prod, stock_quantity=15)

        # Act & Assert
        with patch("django.db.transaction.on_commit") as mock_on_commit:
            check_low_stock(InventoryProduct, inv_prod)
            mock_on_commit.assert_not_called()

    def test_check_low_stock_no_limit(self):
        # Arrange
        prod = MagicMock(low_stock_limit=None)
        inv_prod = MagicMock(product=prod, stock_quantity=0)

        # Act & Assert
        with patch("django.db.transaction.on_commit") as mock_on_commit:
            check_low_stock(InventoryProduct, inv_prod)
            mock_on_commit.assert_not_called()

    def test_check_low_stock_at_or_below_limit_triggers_notification(self):
        # Arrange
        prod = MagicMock(low_stock_limit=10)
        prod.name = "Widget"
        branch = MagicMock(id=1)
        branch.name = "Downtown Branch"
        biz = MagicMock(id=2)
        inv = MagicMock(branch=branch, business=biz)
        inv_prod = MagicMock(product=prod, stock_quantity=5, inventory=inv)

        recipient_user = MagicMock(id=100)

        with patch("django.db.transaction.on_commit") as mock_on_commit, \
             patch("apps.user.models.User.objects.filter") as mock_user_filter, \
             patch("apps.inventory.signals.send_notification") as mock_send_notif:

            # Make filter chains return our recipient
            mock_user_filter.return_value.filter.return_value.distinct.return_value = [recipient_user]

            # Act
            check_low_stock(InventoryProduct, inv_prod)
            mock_on_commit.assert_called_once()

            # Execute the scheduled notify callback
            notify_callback = mock_on_commit.call_args[0][0]
            notify_callback()

            # Assert
            mock_send_notif.assert_called_once()
            _, kwargs = mock_send_notif.call_args
            assert kwargs["user"] == recipient_user
            assert "Low Stock Alert: Widget" in kwargs["title"]
            assert "Widget" in kwargs["content"]
            assert "/inventory/stock?branch=1" == kwargs["action_link"]
