import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from decimal import Decimal
from django.utils import timezone
from unittest.mock import patch, MagicMock

from apps.base.tests import BaseTestCase
from apps.payment.models import (
    Payment, InvoicePayment, StripeConnectAccount
)
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentStatus, PaymentType, PaymentGateway,
    StripeAccountStatus, StripeAccountType
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def env():
    """Fixture to provide the base environment setup."""
    class Env(BaseTestCase):
        def __init__(self):
            pass

    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    tc.list_url = reverse("payment-list")
    tc.initiate_url = reverse("invoice-payment-initiate-online")
    tc.record_offline_url = reverse("invoice-payment-record-offline")
    tc.sync_url = reverse("invoice-payment-sync-status")
    tc.refund_url = reverse("invoice-payment-refund")
    tc.enable_url = reverse("stripe-connect-enable-online-payments")
    tc.status_url = reverse("stripe-connect-connect-status")
    return tc


@pytest.mark.django_db
class TestPaymentViewSet:
    """Test Payment API endpoints."""

    def test_list_payments_authenticated_owner(self, api_client, env):
        """Test listing payments with authenticated owner."""
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK

    def test_list_payments_unauthenticated(self, api_client, env):
        """Test listing payments without authentication."""
        # Arrange
        sut_url = env.list_url
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_payment_success(self, api_client, env):
        """Test retrieving a single payment."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.owner_a)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert sut_response.data["id"] == payment.id

    def test_retrieve_payment_wrong_business(self, api_client, env):
        """Test retrieving payment from different business (multi-tenancy)."""
        # Arrange
        payment_b = Payment.objects.create(
            business=env.business_b,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=env.owner_b
        )
        api_client.force_authenticate(user=env.owner_a)
        sut_url = reverse("payment-detail", args=[payment_b.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND

    def test_filter_payments_by_status(self, api_client, env):
        """Test filtering payments by status."""
        # Arrange
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            created_by=env.owner_a
        )
        Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("500.00"),
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.owner_a)
        sut_url = f"{env.list_url}?status={PaymentStatus.SUCCEEDED}"
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        for payment in sut_response.data:
            assert payment["status"] == PaymentStatus.SUCCEEDED

    def test_cannot_create_payment_via_viewset(self, api_client, env):
        """Test that POST is not allowed on payment list."""
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.owner_a)
        data = {
            "business_id": env.business_a.id,
            "payment_type": PaymentType.INVOICE,
            "method": PaymentMethod.CARD,
            "status": PaymentStatus.PENDING,
            "amount": "1000.00"
        }
        
        # Act
        sut_response = api_client.post(sut_url, data)
        
        # Assert
        assert sut_response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_list_payments_by_manager_assigned_branch(self, api_client, env):
        """Test that a manager can only list payments of their assigned branch (plus subscription/unlinked payments)."""
        # Arrange
        payment_a1 = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment_a1,
            created_by=env.owner_a
        )
        payment_a2 = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a2,
            payment=payment_a2,
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.manager_a1)
        sut_url = env.list_url
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        from django.db.models import Q
        expected_ids = set(
            Payment.objects.filter(
                Q(business=env.business_a) &
                (Q(invoice_payment__invoice__branch__in=env.manager_a1.branches.all()) | Q(invoice_payment__isnull=True))
            ).values_list("id", flat=True)
        )
        response_ids = {payment["id"] for payment in sut_response.data}
        assert response_ids.issubset(expected_ids)
        assert payment_a1.id in response_ids
        assert payment_a2.id not in response_ids

    def test_retrieve_payment_by_manager_assigned_branch(self, api_client, env):
        """Test retrieving payment in assigned branch by manager."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment,
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.manager_a1)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK

    def test_retrieve_payment_by_manager_unassigned_branch(self, api_client, env):
        """Test retrieving payment in unassigned branch by manager returns 404."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a2,
            payment=payment,
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.manager_a1)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_payments_by_employee_assigned_branch_no_permission(self, api_client, env):
        """Test listing payments by employee without custom permission fails with 403."""
        # Arrange
        sut_url = env.list_url
        api_client.force_authenticate(user=env.employee_a1)
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_retrieve_payment_by_employee_assigned_branch_no_permission(self, api_client, env):
        """Test retrieving payment by employee without custom permission fails with 403."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.employee_a1)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_payments_by_employee_assigned_branch_with_permission(self, api_client, env):
        """Test listing payments by employee with custom permission of assigned branch."""
        # Arrange
        payment_a1 = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment_a1,
            created_by=env.owner_a
        )
        env.assign_work_to_user(env.employee_a1, env.branch_a1, "INVOICE")
        api_client.force_authenticate(user=env.employee_a1)
        sut_url = env.list_url
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        response_ids = {p["id"] for p in sut_response.data}
        assert payment_a1.id in response_ids

    def test_retrieve_payment_by_employee_assigned_branch_with_permission(self, api_client, env):
        """Test retrieving payment by employee with permission of assigned branch."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment,
            created_by=env.owner_a
        )
        env.assign_work_to_user(env.employee_a1, env.branch_a1, "INVOICE")
        api_client.force_authenticate(user=env.employee_a1)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK

    def test_retrieve_payment_by_employee_unassigned_branch_with_permission(self, api_client, env):
        """Test retrieving payment by employee in unassigned branch returns 404."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a2,
            payment=payment,
            created_by=env.owner_a
        )
        env.assign_work_to_user(env.employee_a1, env.branch_a1, "INVOICE")
        api_client.force_authenticate(user=env.employee_a1)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND

    def test_list_payments_by_owner_other_business(self, api_client, env):
        """Test that owner of business B cannot see business A's payments."""
        # Arrange
        payment_a = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.owner_b)
        sut_url = env.list_url
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        response_ids = {p["id"] for p in sut_response.data}
        assert payment_a.id not in response_ids

    def test_list_payments_by_manager_a2(self, api_client, env):
        """Test manager of branch A2 only lists payments of branch A2."""
        # Arrange
        payment_a2 = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a2,
            payment=payment_a2,
            created_by=env.owner_a
        )
        payment_a1 = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment_a1,
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.manager_a2)
        sut_url = env.list_url
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        response_ids = {p["id"] for p in sut_response.data}
        assert payment_a2.id in response_ids
        assert payment_a1.id not in response_ids

    def test_retrieve_payment_by_manager_a2_assigned_branch(self, api_client, env):
        """Test manager A2 retrieving payment in their assigned branch."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a2,
            payment=payment,
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.manager_a2)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK

    def test_retrieve_payment_by_manager_a2_unassigned_branch(self, api_client, env):
        """Test manager A2 retrieving payment in unassigned branch returns 404."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment,
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.manager_a2)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_payment_by_owner_other_business(self, api_client, env):
        """Test owner B retrieving payment A returns 404."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.owner_b)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_payment_by_manager_other_business(self, api_client, env):
        """Test manager B retrieving payment A returns 404."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.manager_b1)
        sut_url = reverse("payment-detail", args=[payment.id])
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestInvoicePaymentViewSet:
    """Test Invoice Payment API endpoints."""

    @patch("apps.payment.services.stripe_service.StripeService.create_invoice_checkout_session")
    def test_initiate_online_invoice_payment(self, mock_checkout, api_client, env):
        """Test initiating online invoice payment."""
        # Arrange
        mock_checkout.return_value = MagicMock(
            id="cs_test_123",
            url="https://checkout.stripe.com/pay/cs_test_123"
        )
        StripeConnectAccount.objects.create(
            business=env.business_a,
            stripe_account_id="acct_123",
            status=StripeAccountStatus.ACTIVE,
            charges_enabled=True,
            created_by=env.owner_a
        )
        api_client.force_authenticate(user=env.owner_a)
        sut_url = env.initiate_url
        data = {
            "invoice_id": env.invoice_branch_a1.id,
            "success_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/cancel"
        }
        
        # Act
        sut_response = api_client.post(sut_url, data)
        
        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        assert "checkout_url" in sut_response.data

    def test_record_offline_invoice_payment(self, api_client, env):
        """Test recording offline invoice payment."""
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        sut_url = env.record_offline_url
        data = {
            "invoice_id": env.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00",
            "notes": "Cash manual"
        }
        
        # Act
        sut_response = api_client.post(sut_url, data)
        
        # Assert
        assert sut_response.status_code == status.HTTP_201_CREATED
        assert sut_response.data["method"] == PaymentMethod.CASH
        assert sut_response.data["amount"] == "10.00"

    @patch("stripe.checkout.Session.retrieve")
    def test_sync_invoice_payment_status(self, mock_retrieve_session, api_client, env):
        """Test syncing invoice payment status."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("10.00"),
            created_by=env.owner_a
        )
        from apps.payment.models import PaymentGatewayDetail
        PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_payment_intent_id="pi_123",
            checkout_session_id="cs_123",
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment,
            created_by=env.owner_a
        )

        mock_retrieve_session.return_value = MagicMock(
            payment_status="paid"
        )

        api_client.force_authenticate(user=env.owner_a)
        sut_url = env.sync_url
        data = {
            "invoice_id": env.invoice_branch_a1.id
        }
        
        # Act
        sut_response = api_client.post(sut_url, data)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK

    @patch("apps.payment.services.stripe_service.StripeService.create_refund")
    def test_refund_invoice_payment(self, mock_refund, api_client, env):
        """Test refunding invoice payment."""
        # Arrange
        mock_refund.return_value = MagicMock(id="re_123")
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            paid_at=timezone.now(),
            created_by=env.owner_a
        )
        from apps.payment.models import PaymentGatewayDetail
        PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_charge_id="ch_123",
            stripe_payment_intent_id="pi_123",
            created_by=env.owner_a
        )
        InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment,
            created_by=env.owner_a
        )

        api_client.force_authenticate(user=env.owner_a)
        sut_url = env.refund_url
        data = {
            "payment_id": payment.id,
            "amount": "500.00",
            "reason": "Customer request"
        }
        
        # Act
        sut_response = api_client.post(sut_url, data)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        payment.refresh_from_db()
        assert payment.refunded_amount == Decimal("500.00")

    def test_invoice_payment_list_and_detail_by_manager_assigned_branch(self, api_client, env):
        """Test listing and retrieving invoice payments by manager of assigned branch."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        ip_a1 = InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment,
            created_by=env.owner_a
        )
        
        api_client.force_authenticate(user=env.manager_a1)
        sut_list_url = reverse("invoice-payment-list")
        
        # Act - List
        sut_response_list = api_client.get(sut_list_url)
        
        # Assert
        assert sut_response_list.status_code == status.HTTP_200_OK
        response_ids = {item["id"] for item in sut_response_list.data}
        assert ip_a1.id in response_ids

        # Act - Detail
        sut_detail_url = reverse("invoice-payment-detail", args=[ip_a1.id])
        sut_response_detail = api_client.get(sut_detail_url)
        
        # Assert
        assert sut_response_detail.status_code == status.HTTP_200_OK

        # Arrange - Unassigned
        payment_a2 = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=env.owner_a
        )
        ip_a2 = InvoicePayment.objects.create(
            invoice=env.invoice_branch_a2,
            payment=payment_a2,
            created_by=env.owner_a
        )
        sut_detail_url_unassigned = reverse("invoice-payment-detail", args=[ip_a2.id])
        
        # Act
        sut_response_unassigned = api_client.get(sut_detail_url_unassigned)
        
        # Assert
        assert sut_response_unassigned.status_code == status.HTTP_404_NOT_FOUND

    def test_invoice_payment_initiate_online_and_record_offline_by_manager_assigned_branch(self, api_client, env):
        """Test manager initiating online payment or recording offline payment for assigned and unassigned branch invoices."""
        # Arrange
        api_client.force_authenticate(user=env.manager_a1)
        sut_url = env.record_offline_url
        
        # Act - Assigned
        sut_response_assigned = api_client.post(sut_url, {
            "invoice_id": env.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        
        # Assert
        assert sut_response_assigned.status_code == status.HTTP_201_CREATED

        # Act - Unassigned
        sut_response_unassigned = api_client.post(sut_url, {
            "invoice_id": env.invoice_branch_a2.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        
        # Assert
        assert sut_response_unassigned.status_code == status.HTTP_400_BAD_REQUEST

    def test_invoice_payment_actions_by_employee_no_permission(self, api_client, env):
        """Test that an employee without permission gets 403 Forbidden for all views/actions."""
        # Arrange
        api_client.force_authenticate(user=env.employee_a1)
        
        # Act - List
        sut_response_list = api_client.get(reverse("invoice-payment-list"))
        
        # Assert
        assert sut_response_list.status_code == status.HTTP_403_FORBIDDEN

        # Act - Initiate
        sut_response_initiate = api_client.post(env.initiate_url, {
            "invoice_id": env.invoice_branch_a1.id,
            "success_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/cancel"
        })
        
        # Assert
        assert sut_response_initiate.status_code == status.HTTP_403_FORBIDDEN

        # Act - Record offline
        sut_response_record = api_client.post(env.record_offline_url, {
            "invoice_id": env.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        
        # Assert
        assert sut_response_record.status_code == status.HTTP_403_FORBIDDEN

    def test_invoice_payment_actions_by_employee_assigned_branch_with_permission(self, api_client, env):
        """Test that an employee with PAYMENT custom permission can CRUD in assigned branch but not unassigned."""
        # Arrange
        env.assign_work_to_user(env.employee_a1, env.branch_a1, "INVOICE")
        api_client.force_authenticate(user=env.employee_a1)
        sut_url = env.record_offline_url
        
        # Act - Assigned
        sut_response_assigned = api_client.post(sut_url, {
            "invoice_id": env.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        
        # Assert
        assert sut_response_assigned.status_code == status.HTTP_201_CREATED

        # Act - Unassigned
        sut_response_unassigned = api_client.post(sut_url, {
            "invoice_id": env.invoice_branch_a2.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        
        # Assert
        assert sut_response_unassigned.status_code == status.HTTP_400_BAD_REQUEST

    def test_invoice_payment_cross_business_isolation(self, api_client, env):
        """Test that owner of business B cannot retrieve or execute actions on business A's invoice payments."""
        # Arrange
        payment = Payment.objects.create(
            business=env.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=env.owner_a
        )
        ip_a1 = InvoicePayment.objects.create(
            invoice=env.invoice_branch_a1,
            payment=payment,
            created_by=env.owner_a
        )

        api_client.force_authenticate(user=env.owner_b)
        
        # Act - Detail
        sut_detail_url = reverse("invoice-payment-detail", args=[ip_a1.id])
        sut_response_detail = api_client.get(sut_detail_url)
        
        # Assert
        assert sut_response_detail.status_code == status.HTTP_404_NOT_FOUND

        # Act - Record
        sut_response_record = api_client.post(env.record_offline_url, {
            "invoice_id": env.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        
        # Assert
        assert sut_response_record.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestStripeConnectViewSet:
    """Test Stripe Connect API endpoints."""

    @patch("apps.payment.services.stripe_service.StripeService.create_connect_account")
    @patch("apps.payment.services.stripe_service.StripeService.create_account_link")
    def test_enable_online_payments(self, mock_link, mock_acct, api_client, env):
        """Test enabling online payments."""
        # Arrange
        mock_acct.return_value = MagicMock(id="acct_123")
        mock_link.return_value = MagicMock(url="https://connect.stripe.com/setup/acct_123")
        api_client.force_authenticate(user=env.owner_a)
        sut_url = env.enable_url
        
        # Act
        sut_response = api_client.post(sut_url, {})
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert "onboarding_url" in sut_response.data

    def test_connect_status_not_configured(self, api_client, env):
        """Test connect status when not configured."""
        # Arrange
        api_client.force_authenticate(user=env.owner_a)
        sut_url = env.status_url
        
        # Act
        sut_response = api_client.get(sut_url)
        
        # Assert
        assert sut_response.status_code == status.HTTP_200_OK
        assert sut_response.data["status"] == "NOT_CONFIGURED"
        assert not sut_response.data["can_accept_payments"]
