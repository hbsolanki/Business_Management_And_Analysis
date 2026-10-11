import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch
import pytest
from apps.cost.models import Expense, CostCategory
from apps.cost.serializers.expense import ExpenseSerializer
from apps.business.models import Business, Branch
from apps.base.models import GST


@pytest.mark.django_db
class TestExpenseSerializer:

    @pytest.fixture
    def setup_data(self):
        biz = Business.objects.create(name="Cost Test Biz")
        branch = Branch.objects.create(business=biz, name="Cost Branch")
        cat = CostCategory.objects.create(business=biz, name="Travel")
        return {"business": biz, "branch": branch, "category": cat}

    def test_validate(self, setup_data):
        # Arrange
        data = {
            "title": "Flight ticket",
            "amount": Decimal("1000.00"),
            "gst_rate": Decimal("18.00"),
        }
        ser = ExpenseSerializer(data=data)

        # Act
        valid = ser.is_valid()

        # Assert
        assert valid is True
        assert "tax_data" in ser.validated_data
        assert ser.validated_data["tax_data"]["tax_amount"] == Decimal("180.00")
        assert ser.validated_data["tax_data"]["total_amount"] == Decimal("1180.00")

    def test_create_success_with_gst_and_task(self, setup_data):
        # Arrange
        biz = setup_data["business"]
        branch = setup_data["branch"]
        cat = setup_data["category"]
        mock_user = MagicMock()
        mock_user.business = biz

        data = {
            "title": "Hotel Stay",
            "amount": Decimal("2000.00"),
            "gst_rate": Decimal("12.00"),
            "branch_id": branch.id,
            "category_id": cat.id,
            "date": datetime.date(2026, 5, 10),
            "itc_type": "INPUTS",
        }
        ser = ExpenseSerializer(data=data, context={"request": MagicMock(user=mock_user)})
        assert ser.is_valid(), ser.errors

        # Act
        with patch("apps.gst_management.tasks.update_gst_summary_task.delay") as mock_task:
            sut_expense = ser.save()

            # Assert
            assert sut_expense.id is not None
            assert sut_expense.gst is not None
            assert sut_expense.gst.gst_rate == Decimal("12.00")
            assert sut_expense.gst.gst_amount == Decimal("240.00")
            assert sut_expense.gst.total_amount == Decimal("2240.00")
            mock_task.assert_called_once_with(
                business_id=biz.id,
                month=5,
                year=2026
            )

    def test_create_gst_task_exception_handled(self, setup_data):
        # Arrange
        biz = setup_data["business"]
        cat = setup_data["category"]
        data = {
            "title": "Office Snacks",
            "amount": Decimal("500.00"),
            "gst_rate": Decimal("5.00"),
            "category_id": cat.id,
            "date": datetime.date(2026, 6, 1),
        }
        ser = ExpenseSerializer(data=data, context={"request": MagicMock(user=MagicMock(business=biz))})
        assert ser.is_valid()

        # Act & Assert
        with patch("apps.gst_management.tasks.update_gst_summary_task.delay", side_effect=Exception("Redis down")):
            sut_expense = ser.save()
            assert sut_expense.id is not None

    def test_update_existing_gst_and_date_change(self, setup_data):
        # Arrange
        biz = setup_data["business"]
        cat = setup_data["category"]
        gst_obj = GST.objects.create(
            gst_rate=Decimal("18.00"),
            gst_amount=Decimal("180.00"),
            total_amount=Decimal("1180.00")
        )
        expense = Expense.objects.create(
            business=biz,
            category=cat,
            title="Initial Title",
            amount=Decimal("1000.00"),
            date=datetime.date(2026, 4, 15),
            gst=gst_obj
        )

        update_data = {
            "title": "Updated Title",
            "amount": Decimal("3000.00"),
            "gst_rate": Decimal("18.00"),
            "date": datetime.date(2026, 7, 20),  # different month!
        }
        ser = ExpenseSerializer(instance=expense, data=update_data, partial=True)
        assert ser.is_valid()

        # Act
        with patch("apps.gst_management.tasks.update_gst_summary_task.delay") as mock_task:
            sut_updated = ser.save()

            # Assert
            assert sut_updated.title == "Updated Title"
            assert sut_updated.gst.gst_amount == Decimal("540.00")
            assert sut_updated.gst.total_amount == Decimal("3540.00")
            # Should have called delay twice (once for new date month 7, once for old date month 4)
            assert mock_task.call_count == 2
            mock_task.assert_any_call(business_id=biz.id, month=7, year=2026)
            mock_task.assert_any_call(business_id=biz.id, month=4, year=2026)

    def test_update_create_gst_when_missing(self, setup_data):
        # Arrange
        biz = setup_data["business"]
        cat = setup_data["category"]
        expense = Expense.objects.create(
            business=biz,
            category=cat,
            title="Old Expense without GST",
            amount=Decimal("500.00"),
            date=datetime.date(2026, 8, 1),
            gst=None
        )

        update_data = {
            "amount": Decimal("1000.00"),
            "gst_rate": Decimal("18.00"),
        }
        ser = ExpenseSerializer(instance=expense, data=update_data, partial=True)
        assert ser.is_valid()

        # Act
        with patch("apps.gst_management.tasks.update_gst_summary_task.delay") as mock_task:
            sut_updated = ser.save()

            # Assert
            assert sut_updated.gst is not None
            assert sut_updated.gst.gst_amount == Decimal("180.00")
            mock_task.assert_called_once_with(business_id=biz.id, month=8, year=2026)

    def test_update_gst_task_exception_handled(self, setup_data):
        # Arrange
        biz = setup_data["business"]
        expense = Expense.objects.create(
            business=biz,
            title="Test Exp",
            amount=Decimal("100.00"),
            date=datetime.date(2026, 9, 1),
        )
        ser = ExpenseSerializer(instance=expense, data={"title": "New Title"}, partial=True)
        assert ser.is_valid()

        # Act & Assert
        with patch("apps.gst_management.tasks.update_gst_summary_task.delay", side_effect=Exception("Task error")):
            sut_updated = ser.save()
            assert sut_updated.title == "New Title"

    def test_to_representation(self, setup_data):
        # Arrange
        biz = setup_data["business"]
        gst_obj = GST.objects.create(
            gst_rate=Decimal("18.00"),
            gst_amount=Decimal("18.00"),
            total_amount=Decimal("118.00")
        )
        exp_with_gst = Expense.objects.create(
            business=biz, title="With GST", amount=Decimal("100.00"), date=datetime.date(2026, 1, 1), gst=gst_obj
        )
        exp_no_gst = Expense.objects.create(
            business=biz, title="No GST", amount=Decimal("100.00"), date=datetime.date(2026, 1, 1), gst=None
        )

        # Act
        rep_with = ExpenseSerializer(exp_with_gst).data
        rep_no = ExpenseSerializer(exp_no_gst).data

        # Assert
        assert rep_with["gst_rate"] == Decimal("18.00")
        assert rep_with["gst_amount"] == Decimal("18.00")
        assert rep_with["total_amount"] == Decimal("118.00")

        assert "gst_rate" not in rep_no or rep_no["gst_rate"] is None
