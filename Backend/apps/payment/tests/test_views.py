from django.urls import reverse
from rest_framework import status
from decimal import Decimal
from django.utils import timezone

from apps.base.tests import BaseTestCase
from apps.payment.models import (
    Payment, InvoicePayment, StripeConnectAccount
)
from apps.master.utils.text_choices import (
    PaymentMethod, PaymentStatus, PaymentType, PaymentGateway,
    StripeAccountStatus, StripeAccountType
)
from unittest.mock import patch, MagicMock


class PaymentViewSetTestCase(BaseTestCase):
    """Test Payment API endpoints."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.list_url = reverse("payment-list")

    def test_list_payments_authenticated_owner(self):
        """Test listing payments with authenticated owner."""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_payments_unauthenticated(self):
        """Test listing payments without authentication."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retrieve_payment_success(self):
        """Test retrieving a single payment."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.owner_a)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], payment.id)

    def test_retrieve_payment_wrong_business(self):
        """Test retrieving payment from different business (multi-tenancy)."""
        payment_b = Payment.objects.create(
            business=self.business_b,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("1000.00"),
            created_by=self.owner_b
        )
        self.client.force_authenticate(user=self.owner_a)
        detail_url = reverse("payment-detail", args=[payment_b.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_filter_payments_by_status(self):
        """Test filtering payments by status."""
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            created_by=self.owner_a
        )
        Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("500.00"),
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(f"{self.list_url}?status={PaymentStatus.SUCCEEDED}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for payment in response.data:
            self.assertEqual(payment["status"], PaymentStatus.SUCCEEDED)

    def test_cannot_create_payment_via_viewset(self):
        """Test that POST is not allowed on payment list."""
        self.client.force_authenticate(user=self.owner_a)
        data = {
            "business_id": self.business_a.id,
            "payment_type": PaymentType.INVOICE,
            "method": PaymentMethod.CARD,
            "status": PaymentStatus.PENDING,
            "amount": "1000.00"
        }
        response = self.client.post(self.list_url, data)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_list_payments_by_manager_assigned_branch(self):
        """Test that a manager can only list payments of their assigned branch (plus subscription/unlinked payments)."""
        payment_a1 = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment_a1,
            created_by=self.owner_a
        )
        payment_a2 = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a2,
            payment=payment_a2,
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.manager_a1)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        from django.db.models import Q
        expected_ids = set(
            Payment.objects.filter(
                Q(business=self.business_a) &
                (Q(invoice_payment__invoice__branch__in=self.manager_a1.branches.all()) | Q(invoice_payment__isnull=True))
            ).values_list("id", flat=True)
        )
        response_ids = {payment["id"] for payment in response.data}
        self.assertTrue(response_ids.issubset(expected_ids))
        self.assertIn(payment_a1.id, response_ids)
        self.assertNotIn(payment_a2.id, response_ids)

    def test_retrieve_payment_by_manager_assigned_branch(self):
        """Test retrieving payment in assigned branch by manager."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment,
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.manager_a1)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_payment_by_manager_unassigned_branch(self):
        """Test retrieving payment in unassigned branch by manager returns 404."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a2,
            payment=payment,
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.manager_a1)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_payments_by_employee_assigned_branch_no_permission(self):
        """Test listing payments by employee without custom permission fails with 403."""
        self.client.force_authenticate(user=self.employee_a1)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_payment_by_employee_assigned_branch_no_permission(self):
        """Test retrieving payment by employee without custom permission fails with 403."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.employee_a1)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_payments_by_employee_assigned_branch_with_permission(self):
        """Test listing payments by employee with custom permission of assigned branch."""
        payment_a1 = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment_a1,
            created_by=self.owner_a
        )
        self.assign_work_to_user(self.employee_a1, self.branch_a1, "INVOICE")
        self.client.force_authenticate(user=self.employee_a1)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = {p["id"] for p in response.data}
        self.assertIn(payment_a1.id, response_ids)

    def test_retrieve_payment_by_employee_assigned_branch_with_permission(self):
        """Test retrieving payment by employee with permission of assigned branch."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment,
            created_by=self.owner_a
        )
        self.assign_work_to_user(self.employee_a1, self.branch_a1, "INVOICE")
        self.client.force_authenticate(user=self.employee_a1)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_payment_by_employee_unassigned_branch_with_permission(self):
        """Test retrieving payment by employee in unassigned branch returns 404."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a2,
            payment=payment,
            created_by=self.owner_a
        )
        self.assign_work_to_user(self.employee_a1, self.branch_a1, "INVOICE")
        self.client.force_authenticate(user=self.employee_a1)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_payments_by_owner_other_business(self):
        """Test that owner of business B cannot see business A's payments."""
        payment_a = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.owner_b)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = {p["id"] for p in response.data}
        self.assertNotIn(payment_a.id, response_ids)

    def test_list_payments_by_manager_a2(self):
        """Test manager of branch A2 only lists payments of branch A2."""
        payment_a2 = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a2,
            payment=payment_a2,
            created_by=self.owner_a
        )
        payment_a1 = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment_a1,
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.manager_a2)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = {p["id"] for p in response.data}
        self.assertIn(payment_a2.id, response_ids)
        self.assertNotIn(payment_a1.id, response_ids)

    def test_retrieve_payment_by_manager_a2_assigned_branch(self):
        """Test manager A2 retrieving payment in their assigned branch."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a2,
            payment=payment,
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.manager_a2)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_payment_by_manager_a2_unassigned_branch(self):
        """Test manager A2 retrieving payment in unassigned branch returns 404."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment,
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.manager_a2)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_payments_by_employee_a2_with_permission(self):
        """Test employee of branch A2 with permission can list branch A2 payments."""
        payment_a2 = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a2,
            payment=payment_a2,
            created_by=self.owner_a
        )
        self.assign_work_to_user(self.employee_a2, self.branch_a2, "INVOICE")
        self.client.force_authenticate(user=self.employee_a2)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = {p["id"] for p in response.data}
        self.assertIn(payment_a2.id, response_ids)

    def test_retrieve_payment_by_employee_a2_with_permission(self):
        """Test employee A2 with permission retrieving payment in branch A2."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a2,
            payment=payment,
            created_by=self.owner_a
        )
        self.assign_work_to_user(self.employee_a2, self.branch_a2, "INVOICE")
        self.client.force_authenticate(user=self.employee_a2)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_payment_by_employee_a2_unassigned_branch_with_permission(self):
        """Test employee A2 with permission retrieving payment in unassigned branch (A1) returns 404."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment,
            created_by=self.owner_a
        )
        self.assign_work_to_user(self.employee_a2, self.branch_a2, "INVOICE")
        self.client.force_authenticate(user=self.employee_a2)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_payment_by_owner_other_business(self):
        """Test owner B retrieving payment A returns 404."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.owner_b)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_payment_by_manager_other_business(self):
        """Test manager B retrieving payment A returns 404."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.manager_b1)
        detail_url = reverse("payment-detail", args=[payment.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)




class InvoicePaymentViewSetTestCase(BaseTestCase):
    """Test Invoice Payment API endpoints."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.initiate_url = reverse("invoice-payment-initiate-online")
        self.record_offline_url = reverse("invoice-payment-record-offline")
        self.sync_url = reverse("invoice-payment-sync-status")
        self.refund_url = reverse("invoice-payment-refund")

    @patch("apps.payment.services.stripe_service.StripeService.create_invoice_checkout_session")
    def test_initiate_online_invoice_payment(self, mock_checkout):
        """Test initiating online invoice payment."""
        mock_checkout.return_value = MagicMock(
            id="cs_test_123",
            url="https://checkout.stripe.com/pay/cs_test_123"
        )
        StripeConnectAccount.objects.create(
            business=self.business_a,
            stripe_account_id="acct_123",
            status=StripeAccountStatus.ACTIVE,
            charges_enabled=True,
            created_by=self.owner_a
        )
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(self.initiate_url, {
            "invoice_id": self.invoice_branch_a1.id,
            "success_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/cancel"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("checkout_url", response.data)

    def test_record_offline_invoice_payment(self):
        """Test recording offline invoice payment."""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(self.record_offline_url, {
            "invoice_id": self.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00",
            "notes": "Cash manual"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["method"], PaymentMethod.CASH)
        self.assertEqual(response.data["amount"], "10.00")

    @patch("stripe.checkout.Session.retrieve")
    def test_sync_invoice_payment_status(self, mock_retrieve_session):
        """Test syncing invoice payment status."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.PENDING,
            amount=Decimal("10.00"),
            created_by=self.owner_a
        )
        from apps.payment.models import PaymentGatewayDetail
        PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_payment_intent_id="pi_123",
            checkout_session_id="cs_123",
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment,
            created_by=self.owner_a
        )

        mock_retrieve_session.return_value = MagicMock(
            payment_status="paid"
        )

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(self.sync_url, {
            "invoice_id": self.invoice_branch_a1.id
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch("apps.payment.services.stripe_service.StripeService.create_refund")
    def test_refund_invoice_payment(self, mock_refund):
        """Test refunding invoice payment."""
        mock_refund.return_value = MagicMock(id="re_123")
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("1000.00"),
            paid_at=timezone.now(),
            created_by=self.owner_a
        )
        from apps.payment.models import PaymentGatewayDetail
        PaymentGatewayDetail.objects.create(
            payment=payment,
            gateway=PaymentGateway.STRIPE,
            stripe_charge_id="ch_123",
            stripe_payment_intent_id="pi_123",
            created_by=self.owner_a
        )
        InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment,
            created_by=self.owner_a
        )

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(self.refund_url, {
            "payment_id": payment.id,
            "amount": "500.00",
            "reason": "Customer request"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.refunded_amount, Decimal("500.00"))

    def test_invoice_payment_list_and_detail_by_manager_assigned_branch(self):
        """Test listing and retrieving invoice payments by manager of assigned branch."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        ip_a1 = InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment,
            created_by=self.owner_a
        )
        
        self.client.force_authenticate(user=self.manager_a1)
        response = self.client.get(reverse("invoice-payment-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response_ids = {item["id"] for item in response.data}
        self.assertIn(ip_a1.id, response_ids)

        detail_url = reverse("invoice-payment-detail", args=[ip_a1.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payment_a2 = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("200.00"),
            created_by=self.owner_a
        )
        ip_a2 = InvoicePayment.objects.create(
            invoice=self.invoice_branch_a2,
            payment=payment_a2,
            created_by=self.owner_a
        )
        detail_url_unassigned = reverse("invoice-payment-detail", args=[ip_a2.id])
        response = self.client.get(detail_url_unassigned)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invoice_payment_initiate_online_and_record_offline_by_manager_assigned_branch(self):
        """Test manager initiating online payment or recording offline payment for assigned and unassigned branch invoices."""
        self.client.force_authenticate(user=self.manager_a1)
        
        response = self.client.post(self.record_offline_url, {
            "invoice_id": self.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.post(self.record_offline_url, {
            "invoice_id": self.invoice_branch_a2.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invoice_payment_actions_by_employee_no_permission(self):
        """Test that an employee without permission gets 403 Forbidden for all views/actions."""
        self.client.force_authenticate(user=self.employee_a1)
        
        response = self.client.get(reverse("invoice-payment-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(self.initiate_url, {
            "invoice_id": self.invoice_branch_a1.id,
            "success_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/cancel"
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        response = self.client.post(self.record_offline_url, {
            "invoice_id": self.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invoice_payment_actions_by_employee_assigned_branch_with_permission(self):
        """Test that an employee with PAYMENT custom permission can CRUD in assigned branch but not unassigned."""
        self.assign_work_to_user(self.employee_a1, self.branch_a1, "INVOICE")
        self.client.force_authenticate(user=self.employee_a1)

        response = self.client.post(self.record_offline_url, {
            "invoice_id": self.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.post(self.record_offline_url, {
            "invoice_id": self.invoice_branch_a2.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invoice_payment_cross_business_isolation(self):
        """Test that owner of business B cannot retrieve or execute actions on business A's invoice payments."""
        payment = Payment.objects.create(
            business=self.business_a,
            payment_type=PaymentType.INVOICE,
            method=PaymentMethod.CARD,
            status=PaymentStatus.SUCCEEDED,
            amount=Decimal("100.00"),
            created_by=self.owner_a
        )
        ip_a1 = InvoicePayment.objects.create(
            invoice=self.invoice_branch_a1,
            payment=payment,
            created_by=self.owner_a
        )

        self.client.force_authenticate(user=self.owner_b)
        
        detail_url = reverse("invoice-payment-detail", args=[ip_a1.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.post(self.record_offline_url, {
            "invoice_id": self.invoice_branch_a1.id,
            "method": PaymentMethod.CASH,
            "amount": "10.00"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)



class StripeConnectViewSetTestCase(BaseTestCase):
    """Test Stripe Connect API endpoints."""

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment()
        self.enable_url = reverse("stripe-connect-enable-online-payments")
        self.status_url = reverse("stripe-connect-connect-status")

    @patch("apps.payment.services.stripe_service.StripeService.create_connect_account")
    @patch("apps.payment.services.stripe_service.StripeService.create_account_link")
    def test_enable_online_payments(self, mock_link, mock_acct):
        """Test enabling online payments."""
        mock_acct.return_value = MagicMock(id="acct_123")
        mock_link.return_value = MagicMock(url="https://connect.stripe.com/setup/acct_123")

        self.client.force_authenticate(user=self.owner_a)
        response = self.client.post(self.enable_url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("onboarding_url", response.data)

    def test_connect_status_not_configured(self):
        """Test connect status when not configured."""
        self.client.force_authenticate(user=self.owner_a)
        response = self.client.get(self.status_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "NOT_CONFIGURED")
        self.assertFalse(response.data["can_accept_payments"])
