import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from apps.base.tests import BaseTestCase
from apps.activity_log.models import ActivityLog
from apps.inventory.models import InventoryTransaction
from apps.invoice.models import Invoice, ProductInvoice
from apps.gst_management.models import MonthlyGSTSummary
from apps.supplier.models import SalesOrder
from django.db.models import Sum


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def invoice_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


def get_valid_payload(branch_id, product_a1_id, product_a2_id):
    return {
        "branch_id": branch_id,
        "payment_mode": "CASH",
        "customer": {
            "name": "New Customer",
            "mobile_number": "0987654321",
            "gender": "MALE",
            "age": 25,
            "email": "customer@example.com"
        },
        "invoice_items": [
            {
                "product_id": product_a1_id,
                "quantity": 2,
                "base_price": "10.00",
                "selling_price": "15.00"
            },
            {
                "product_id": product_a2_id,
                "quantity": 1,
                "base_price": "20.00",
                "selling_price": "25.00"
            }
        ]
    }


@pytest.mark.django_db
class TestInvoicePytest:

    # NEGATIVE TEST CASES
    def test_create_invoice_without_payment_mode(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)
        sut_payload.pop("payment_mode")

        # Act
        sut_response = sut_client.post(sut_url, sut_payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "payment_mode" in sut_response.data

    def test_create_invoice_without_invoice_items(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)
        sut_payload["invoice_items"] = []

        # Act
        sut_response = sut_client.post(sut_url, sut_payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_invoice_with_invalid_product(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)
        sut_payload["invoice_items"][0]["product_id"] = 99999

        # Act
        sut_response = sut_client.post(sut_url, sut_payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_invoice_insufficient_stock(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)
        sut_payload["invoice_items"][0]["quantity"] = 10000

        # Act
        sut_response = sut_client.post(sut_url, sut_payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_400_BAD_REQUEST
        assert "quantity" in sut_response.data["invoice_items"][0]

    # OWNER
    def test_invoice_crud_by_owner(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)

        # 1. Create
        # Act
        sut_response = sut_client.post(sut_url, sut_payload, format='json')
        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        invoice_env._verify_log(ActivityLog.Action.CREATE, ActivityLog.Module.INVOICE)

        # 2. Read
        # Act
        sut_read_response = sut_client.get(sut_url)
        # Assert
        assert sut_read_response.status_code == status.HTTP_200_OK
        total_count = Invoice.objects.filter(business=invoice_env.owner_a.business).count()
        expected_len = min(6, total_count)
        assert len(sut_read_response.data.get('results', sut_read_response.data)) == expected_len

        # 3. Update
        # Arrange
        detail_url = reverse('invoice-detail', args=[invoice_env.invoice_branch_a1.id])
        update_data = {"payment_mode": "CASH", "branch_id": invoice_env.branch_a1.id}
        # Act
        sut_update_res = sut_client.patch(detail_url, update_data)
        # Assert
        assert sut_update_res.status_code == status.HTTP_200_OK

        # 4. Delete
        # Act
        sut_delete_res = sut_client.delete(detail_url)
        # Assert
        assert sut_delete_res.status_code == status.HTTP_204_NO_CONTENT
        invoice_env._verify_log(ActivityLog.Action.DELETE, ActivityLog.Module.INVOICE)

    # MANAGER
    def test_invoice_crud_by_manager_assigned_branch(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.manager_a1)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)

        # 1. Create
        # Act
        sut_res = sut_client.post(sut_url, sut_payload, format='json')
        # Assert
        assert sut_res.status_code == status.HTTP_201_CREATED

        # 2. Read
        # Act
        sut_read_res = sut_client.get(sut_url)
        # Assert
        assert sut_read_res.status_code == status.HTTP_200_OK
        expected_count = Invoice.objects.filter(branch=invoice_env.branch_a1).count()
        assert len(sut_read_res.data.get('results', sut_read_res.data)) == expected_count

        # 3. Update
        # Arrange
        detail_url = reverse('invoice-detail', args=[invoice_env.invoice_branch_a1.id])
        # Act
        sut_patch_res = sut_client.patch(detail_url, {"payment_mode": "CASH", "branch_id": invoice_env.branch_a1.id})
        # Assert
        assert sut_patch_res.status_code == status.HTTP_200_OK

        # 4. Delete
        # Act
        sut_del_res = sut_client.delete(detail_url)
        # Assert
        assert sut_del_res.status_code == status.HTTP_204_NO_CONTENT

    def test_invoice_crud_by_manager_unassigned_branch(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.manager_a1)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a2.id, invoice_env.product_a1.id, invoice_env.product_a2.id)

        # 1. Create for unassigned
        # Act
        sut_post_res = sut_client.post(sut_url, sut_payload, format='json')
        # Assert
        assert sut_post_res.status_code == status.HTTP_400_BAD_REQUEST

        # 2. Read
        # Arrange
        detail_url = reverse('invoice-detail', args=[invoice_env.invoice_branch_a2.id])
        # Act
        sut_get_res = sut_client.get(detail_url)
        # Assert
        assert sut_get_res.status_code == status.HTTP_404_NOT_FOUND

        # 3. Update
        # Act
        sut_patch_res = sut_client.patch(detail_url, {"payment_mode": "CASH", "branch_id": invoice_env.branch_a2.id})
        # Assert
        assert sut_patch_res.status_code == status.HTTP_404_NOT_FOUND

        # 4. Delete
        # Act
        sut_del_res = sut_client.delete(detail_url)
        # Assert
        assert sut_del_res.status_code == status.HTTP_404_NOT_FOUND

    # EMPLOYEE NO PERMISSION
    def test_invoice_employee_assigned_branch_no_permission(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.employee_a1)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)
        detail_url = reverse('invoice-detail', args=[invoice_env.invoice_branch_a1.id])

        # Act & Assert (Create)
        assert sut_client.post(sut_url, sut_payload, format='json').status_code == status.HTTP_403_FORBIDDEN
        # Act & Assert (Read)
        assert sut_client.get(sut_url).status_code == status.HTTP_403_FORBIDDEN
        # Act & Assert (Update)
        assert sut_client.patch(detail_url, {"payment_mode": "CASH", "branch_id": invoice_env.branch_a1.id}).status_code == status.HTTP_403_FORBIDDEN
        # Act & Assert (Delete)
        assert sut_client.delete(detail_url).status_code == status.HTTP_403_FORBIDDEN

    def test_invoice_employee_unassigned_branch_no_permission(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.employee_a1)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a2.id, invoice_env.product_a1.id, invoice_env.product_a2.id)
        detail_url = reverse('invoice-detail', args=[invoice_env.invoice_branch_a2.id])

        # Act & Assert (Create)
        assert sut_client.post(sut_url, sut_payload, format='json').status_code == status.HTTP_403_FORBIDDEN
        # Act & Assert (Read)
        assert sut_client.get(detail_url).status_code == status.HTTP_403_FORBIDDEN

    # EMPLOYEE WITH PERMISSION
    def test_invoice_employee_assigned_branch_with_permission(self, api_client, invoice_env):
        # Arrange
        invoice_env.assign_work_to_user(invoice_env.employee_a1, invoice_env.branch_a1, "INVOICE")
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.employee_a1)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)

        # 1. Create
        # Act
        res_create = sut_client.post(sut_url, sut_payload, format='json')
        # Assert
        assert res_create.status_code == status.HTTP_201_CREATED

        # 2. Read
        # Act
        res_read = sut_client.get(sut_url)
        # Assert
        assert res_read.status_code == status.HTTP_200_OK
        expected_count = Invoice.objects.filter(branch=invoice_env.branch_a1).count()
        assert len(res_read.data.get('results', res_read.data)) == expected_count

        # 3. Update
        # Arrange
        detail_url = reverse('invoice-detail', args=[invoice_env.invoice_branch_a1.id])
        # Act
        res_patch = sut_client.patch(detail_url, {"payment_mode": "CASH", "branch_id": invoice_env.branch_a1.id})
        # Assert
        assert res_patch.status_code == status.HTTP_200_OK

        # 4. Delete
        # Act
        res_del = sut_client.delete(detail_url)
        # Assert
        assert res_del.status_code == status.HTTP_204_NO_CONTENT

    def test_invoice_employee_unassigned_branch_with_permission(self, api_client, invoice_env):
        # Arrange
        invoice_env.assign_work_to_user(invoice_env.employee_a1, invoice_env.branch_a1, "INVOICE")
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.employee_a1)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a2.id, invoice_env.product_a1.id, invoice_env.product_a2.id)
        detail_url = reverse('invoice-detail', args=[invoice_env.invoice_branch_a2.id])

        # Act & Assert (Create)
        assert sut_client.post(sut_url, sut_payload, format='json').status_code == status.HTTP_400_BAD_REQUEST
        # Act & Assert (Read)
        assert sut_client.get(detail_url).status_code == status.HTTP_404_NOT_FOUND
        # Act & Assert (Update)
        assert sut_client.patch(detail_url, {"payment_mode": "CASH", "branch_id": invoice_env.branch_a2.id}).status_code == status.HTTP_404_NOT_FOUND
        # Act & Assert (Delete)
        assert sut_client.delete(detail_url).status_code == status.HTTP_404_NOT_FOUND

    # CROSS BUSINESS
    def test_invoice_crud_by_owner_other_business(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_b)
        detail_url = reverse('invoice-detail', args=[invoice_env.invoice_branch_a1.id])

        # Act & Assert
        assert sut_client.get(detail_url).status_code == status.HTTP_404_NOT_FOUND
        assert sut_client.patch(detail_url, {"payment_mode": "CASH", "branch_id": invoice_env.branch_a1.id}).status_code == status.HTTP_404_NOT_FOUND
        assert sut_client.delete(detail_url).status_code == status.HTTP_404_NOT_FOUND

    # Filter combination tests
    def test_invoice_filtering_combinations(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')

        Invoice.objects.filter(id=invoice_env.invoice_branch_a1.id).update(created_at=timezone.now())
        Invoice.objects.filter(id=invoice_env.invoice_branch_a1_2.id).update(created_at=timezone.now() - timedelta(days=1))
        Invoice.objects.filter(id=invoice_env.invoice_branch_a2.id).update(created_at=timezone.now() - timedelta(days=2))
        from_date = (timezone.now().date() - timedelta(days=1)).isoformat()
        to_date = (timezone.now().date() - timedelta(days=1)).isoformat()

        # 1. Branch A1 filter
        res1 = sut_client.get(f"{sut_url}?branch={invoice_env.branch_a1.id}")
        assert res1.status_code == 200
        expected_count1 = Invoice.objects.filter(branch=invoice_env.branch_a1).count()
        assert len(res1.data["results"]) == expected_count1
        assert res1.data["results"][0]["branch"] == invoice_env.branch_a1.id

        # 2. Branch A2 filter
        res2 = sut_client.get(f"{sut_url}?branch={invoice_env.branch_a2.id}")
        assert res2.status_code == 200
        expected_count2 = Invoice.objects.filter(branch=invoice_env.branch_a2).count()
        assert len(res2.data["results"]) == expected_count2
        assert res2.data["results"][0]["branch"] == invoice_env.branch_a2.id

        # 3. Mobile number exact
        res3 = sut_client.get(f"{sut_url}?mobile_number={invoice_env.customer_a.mobile_number}")
        assert res3.status_code == 200
        expected_count3 = Invoice.objects.filter(business=invoice_env.business_a, customer__mobile_number=invoice_env.customer_a.mobile_number).count()
        assert len(res3.data["results"]) == expected_count3
        assert res3.data["results"][0]["customer"]["mobile_number"] == invoice_env.customer_a.mobile_number

        # 4. From date filter
        res4 = sut_client.get(f"{sut_url}?from_date={from_date}")
        assert res4.status_code == 200
        expected_count4 = Invoice.objects.filter(business=invoice_env.business_a, created_at__date__gte=from_date).count()
        assert len(res4.data["results"]) == expected_count4
        assert res4.data["results"][0]["created_at"][:10] >= from_date

        # 5. To date filter
        res5 = sut_client.get(f"{sut_url}?to_date={to_date}")
        assert res5.status_code == 200
        expected_count5 = Invoice.objects.filter(business=invoice_env.business_a, created_at__date__lte=to_date).count()
        assert len(res5.data["results"]) == expected_count5
        assert res5.data["results"][0]["created_at"][:10] <= to_date

        # 6. Branch + from date
        res6 = sut_client.get(f"{sut_url}?branch={invoice_env.branch_a1.id}&from_date={from_date}")
        assert res6.status_code == 200
        expected_count6 = Invoice.objects.filter(branch=invoice_env.branch_a1, created_at__date__gte=from_date).count()
        assert len(res6.data["results"]) == expected_count6

        # 7. Branch + to date
        res7 = sut_client.get(f"{sut_url}?branch={invoice_env.branch_a1.id}&to_date={to_date}")
        assert res7.status_code == 200
        expected_count7 = Invoice.objects.filter(branch=invoice_env.branch_a1, created_at__date__lte=to_date).count()
        assert len(res7.data["results"]) == expected_count7

        # 8. From date + to date range
        res8 = sut_client.get(f"{sut_url}?from_date={from_date}&to_date={to_date}")
        assert res8.status_code == 200
        expected_count8 = Invoice.objects.filter(business=invoice_env.business_a, created_at__date__gte=from_date, created_at__date__lte=to_date).count()
        assert len(res8.data["results"]) == expected_count8

        # 9. Mobile + from date
        res9 = sut_client.get(f"{sut_url}?mobile_number={invoice_env.customer_a.mobile_number}&from_date={from_date}")
        assert res9.status_code == 200
        expected_count9 = Invoice.objects.filter(business=invoice_env.business_a, customer__mobile_number=invoice_env.customer_a.mobile_number, created_at__date__gte=from_date).count()
        assert len(res9.data["results"]) == expected_count9

        # 10. Branch + mobile + date range
        res10 = sut_client.get(f"{sut_url}?branch={invoice_env.branch_a1.id}&mobile_number={invoice_env.customer_a.mobile_number}&from_date={from_date}")
        assert res10.status_code == 200
        expected_count10 = Invoice.objects.filter(branch=invoice_env.branch_a1, customer__mobile_number=invoice_env.customer_a.mobile_number, created_at__date__gte=from_date).count()
        assert len(res10.data["results"]) == expected_count10

    # Pagination test
    def test_invoice_pagination(self, api_client, invoice_env):
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')

        for i in range(3):
            inv = Invoice.objects.create(
                business=invoice_env.business_a,
                branch=invoice_env.branch_a1,
                customer=invoice_env.customer_a,
                total_amount=50.00,
                sub_total=50.00
            )
            ProductInvoice.objects.create(
                invoice=inv,
                product=invoice_env.product_a1,
                quantity=1,
                selling_price=50.00,
                base_price=45.00
            )

        # Act (Page 1)
        res1 = sut_client.get(sut_url)
        # Assert
        assert res1.status_code == 200
        assert len(res1.data["results"]) == 6
        assert res1.data["next"] is not None

        # Act (Page 2)
        res2 = sut_client.get(res1.data["next"])
        # Assert
        assert res2.status_code == 200
        assert len(res2.data["results"]) == 5
        assert res2.data["next"] is None

    def test_inventory_transaction_created_on_invoice_creation(self, api_client, invoice_env):
        """Verify InventoryTransaction (OUT) is created when an Invoice is created."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)
        initial_tx_count = InventoryTransaction.objects.count()

        # Act
        sut_response = sut_client.post(sut_url, sut_payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        invoice_id = sut_response.data["id"]
        assert InventoryTransaction.objects.count() == initial_tx_count + 1

        tx = InventoryTransaction.objects.latest('created_at')
        assert tx.action == "OUT"
        assert tx.inventory.branch.id == invoice_env.branch_a1.id
        assert f"Invoice #{invoice_id}" in tx.description
        assert tx.items.count() == 2
        tx_items = {item.product.id: item.quantity for item in tx.items.all()}
        for item in sut_payload["invoice_items"]:
            assert tx_items[item["product_id"]] == item["quantity"]

    def test_invoice_gst_calculation(self, api_client, invoice_env):
        """Verify that total_amount correctly includes GST based on product output_gst_rate."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')

        base_price_a1 = Decimal(str(invoice_env.product_a1.base_price))
        gst_rate_a1 = Decimal(str(invoice_env.product_a1.output_gst_rate))
        gst_amount_a1 = base_price_a1 * gst_rate_a1 / Decimal("100")
        expected_selling_price_a1 = base_price_a1 + gst_amount_a1

        base_price_a2 = Decimal(str(invoice_env.product_a2.base_price))
        gst_rate_a2 = Decimal(str(invoice_env.product_a2.output_gst_rate))
        gst_amount_a2 = base_price_a2 * gst_rate_a2 / Decimal("100")
        expected_selling_price_a2 = base_price_a2 + gst_amount_a2

        qty_a1 = Decimal("2")
        qty_a2 = Decimal("1")
        expected_sub_total = (base_price_a1 * qty_a1) + (base_price_a2 * qty_a2)
        expected_total_amount = (expected_selling_price_a1 * qty_a1) + (expected_selling_price_a2 * qty_a2)

        sut_payload = {
            "branch_id": invoice_env.branch_a1.id,
            "payment_mode": "CASH",
            "customer": {
                "name": "GST Test Customer",
                "mobile_number": "1122334455"
            },
            "invoice_items": [
                {
                    "product_id": invoice_env.product_a1.id,
                    "quantity": qty_a1
                },
                {
                    "product_id": invoice_env.product_a2.id,
                    "quantity": qty_a2
                }
            ]
        }

        # Act
        sut_response = sut_client.post(sut_url, sut_payload, format='json')

        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        assert Decimal(str(sut_response.data["sub_total"])) == expected_sub_total.quantize(Decimal("0.00"))
        assert Decimal(str(sut_response.data["total_amount"])) == expected_total_amount.quantize(Decimal("0.00"))

        expected_total_tax = expected_total_amount - expected_sub_total
        expected_cgst = expected_total_tax / Decimal("2")
        expected_sgst = expected_total_tax / Decimal("2")

        invoice = Invoice.objects.get(id=sut_response.data["id"])
        assert invoice.gst is not None
        assert invoice.gst.gst_amount == expected_total_tax.quantize(Decimal("0.00"))
        assert invoice.gst.cgst_amount == expected_cgst.quantize(Decimal("0.00"))
        assert invoice.gst.sgst_amount == expected_sgst.quantize(Decimal("0.00"))
        assert invoice.gst.igst_amount == Decimal("0.00")

        items = ProductInvoice.objects.filter(invoice_id=sut_response.data["id"])
        item1 = items.get(product=invoice_env.product_a1)
        assert item1.base_price == invoice_env.product_a1.base_price
        assert item1.selling_price == expected_selling_price_a1.quantize(Decimal("0.00"))

        item2 = items.get(product=invoice_env.product_a2)
        assert item2.base_price == invoice_env.product_a2.base_price
        assert item2.selling_price == expected_selling_price_a2.quantize(Decimal("0.00"))

    def test_gst_summary_auto_aggregation(self, api_client, invoice_env):
        """Verify that MonthlyGSTSummary is automatically updated when an invoice is created."""
        # Arrange
        sut_client = api_client
        sut_client.force_authenticate(user=invoice_env.owner_a)
        sut_url = reverse('invoice-list')

        month = timezone.now().month
        year = timezone.now().year

        aggregates = Invoice.objects.filter(
            business=invoice_env.owner_a.business,
            created_at__month=month,
            created_at__year=year,
            is_deleted=False
        ).aggregate(total_sales=Sum('total_amount'))

        so_aggregates = SalesOrder.objects.filter(
            business=invoice_env.owner_a.business,
            created_at__month=month,
            created_at__year=year,
            is_deleted=False,
            invoices__isnull=True
        ).aggregate(total_sales=Sum('total_amount'))

        initial_sales = (aggregates['total_sales'] or Decimal("0.00")) + (so_aggregates['total_sales'] or Decimal("0.00"))
        sut_payload = get_valid_payload(invoice_env.branch_a1.id, invoice_env.product_a1.id, invoice_env.product_a2.id)

        # Act
        response = sut_client.post(sut_url, sut_payload, format='json')

        # Assert
        assert response.status_code == status.HTTP_201_CREATED
        summary = MonthlyGSTSummary.objects.get(business=invoice_env.owner_a.business, month=month, year=year)
        expected_sales = initial_sales + Decimal(str(response.data["total_amount"]))
        assert summary.total_sales == expected_sales

        # Act (second invoice)
        response2 = sut_client.post(sut_url, sut_payload, format='json')
        summary.refresh_from_db()
        expected_total = expected_sales + Decimal(str(response2.data["total_amount"]))

        # Assert
        assert summary.total_sales == expected_total
