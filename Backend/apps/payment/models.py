from django.db import models
from apps.base.models import BaseModel
from apps.business.models import Business
from apps.invoice.models import Invoice
from apps.subscription.models import Subscription
from apps.master.utils.text_choices import (
    PaymentType, PaymentMethod, PaymentStatus,
    PaymentGateway, StripeAccountType, StripeAccountStatus,
)


class StripeConnectAccount(BaseModel):

    business = models.OneToOneField(
        Business, on_delete=models.CASCADE, related_name="stripe_connect_account"
    )
    stripe_account_id = models.CharField(
        max_length=255, unique=True, db_index=True,
        help_text="Stripe Connect account ID (acct_xxx)"
    )
    account_type = models.CharField(
        max_length=20,
        choices=StripeAccountType.choices,
        default=StripeAccountType.EXPRESS,
    )
    status = models.CharField(
        max_length=20,
        choices=StripeAccountStatus.choices,
        default=StripeAccountStatus.PENDING,
        db_index=True,
    )

    # Stripe flags — synced via account.updated webhook
    charges_enabled = models.BooleanField(default=False)
    payouts_enabled = models.BooleanField(default=False)
    details_submitted = models.BooleanField(default=False)

    # Timestamps
    onboarding_started_at = models.DateTimeField(null=True, blank=True)
    onboarded_at = models.DateTimeField(null=True, blank=True)   # when charges_enabled became True
    disabled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "bma_stripe_connect_account"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["stripe_account_id"]),
        ]

    def __str__(self):
        return f"{self.business} | {self.stripe_account_id} | {self.status}"

    @property
    def can_accept_payments(self):
        return self.charges_enabled and self.status == StripeAccountStatus.ACTIVE


class Payment(BaseModel):
    """
    Central normalized payment record — single source of truth for every money movement.

    Normalized design:
      ┌──────────────┐        ┌──────────────────────┐
      │   Payment    │ 1 ─── 1│   InvoicePayment     │ ──► Invoice
      │  (this table)│
      │              │ 1 ─── 1│ SubscriptionPayment  │ ──► Subscription
      └──────────────┘
              │ 1 ──► N   WebhookEvent
              │ 1 ──── 1  PaymentGatewayDetail  (Stripe-specific fields)

    Rules:
      - payment_type tells which child table is populated (InvoicePayment OR SubscriptionPayment)
      - Stripe/gateway fields live in PaymentGatewayDetail, not here
      - Offline methods (CASH/CHEQUE/NEFT/RTGS/IMPS) have no PaymentGatewayDetail row
    """

    business = models.ForeignKey(
        Business, on_delete=models.CASCADE, related_name="payments"
    )
    payment_type = models.CharField(
        max_length=20, choices=PaymentType.choices, db_index=True,
    )
    method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, db_index=True,
    )
    status = models.CharField(
        max_length=25,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="INR")
    refunded_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # For offline methods: UTR number (NEFT/RTGS/IMPS), cheque number, etc.
    reference_number = models.CharField(max_length=255, null=True, blank=True)

    paid_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)

    failure_reason = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "bma_payment"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "payment_type", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(amount__gt=0), name="payment_amount_gt_zero"),
            models.CheckConstraint(check=models.Q(refunded_amount__gte=0), name="payment_refunded_amount_gte_zero"),
            models.CheckConstraint(check=models.Q(refunded_amount__lte=models.F("amount")), name="payment_refunded_amount_lte_amount"),
        ]

    def __str__(self):
        return f"{self.get_payment_type_display()} | {self.amount} {self.currency} | {self.status}"


class PaymentGatewayDetail(BaseModel):
    payment = models.OneToOneField(
        Payment, on_delete=models.CASCADE, related_name="gateway_detail"
    )
    gateway = models.CharField(max_length=20, choices=PaymentGateway.choices)

    # --- Common Stripe fields ---
    stripe_payment_intent_id = models.CharField(
        max_length=255, null=True, blank=True, unique=True, db_index=True
    )
    stripe_charge_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True)

    # --- Invoice payment (Stripe Connect) ---
    stripe_connected_account_id = models.CharField(
        max_length=255, null=True, blank=True, db_index=True,
        help_text="Destination connected account (acct_xxx) for invoice payments"
    )
    platform_fee = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Platform application_fee_amount deducted from the invoice payment"
    )
    checkout_session_id = models.CharField(max_length=255, null=True, blank=True)
    payment_link = models.URLField(max_length=500, null=True, blank=True)
    payment_link_expires_at = models.DateTimeField(null=True, blank=True)

    # --- Subscription payment (standard Stripe Billing) ---
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_invoice_id = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        db_table = "bma_payment_gateway_detail"
        indexes = [
            models.Index(fields=["stripe_payment_intent_id"]),
            models.Index(fields=["stripe_connected_account_id"]),
        ]

    def __str__(self):
        return f"{self.gateway} | Payment #{self.payment_id}"


class InvoicePayment(BaseModel):
    payment = models.OneToOneField(
        Payment, on_delete=models.CASCADE, related_name="invoice_payment"
    )
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name="payments"
    )

    class Meta:
        db_table = "bma_invoice_payment"
        indexes = [models.Index(fields=["invoice"])]

    def __str__(self):
        return f"Invoice #{self.invoice_id} ← Payment #{self.payment_id}"


class SubscriptionPayment(BaseModel):
    """
    Links a Payment to a Subscription.

    Admin-managed only — business owners never create these.
    Uses standard Stripe Billing (NOT Stripe Connect).

    Flow:
      1. Admin creates/upgrades a Subscription for a Business
      2. Stripe Billing fires invoice.paid → backend creates Payment (SUCCEEDED) + SubscriptionPayment
      3. Stripe fires invoice.payment_failed → backend creates Payment (FAILED) + SubscriptionPayment
    """
    payment = models.OneToOneField(
        Payment, on_delete=models.CASCADE, related_name="subscription_payment"
    )
    subscription = models.ForeignKey(
        Subscription, on_delete=models.CASCADE, related_name="payments"
    )

    class Meta:
        db_table = "bma_subscription_payment"
        indexes = [models.Index(fields=["subscription"])]

    def __str__(self):
        return f"Subscription #{self.subscription_id} ← Payment #{self.payment_id}"


class WebhookEvent(BaseModel):
    """
    Idempotent log of every incoming Stripe webhook.
    Prevents double-processing when Stripe retries.

    Covers:
      - account.updated          → update StripeConnectAccount flags
      - payment_intent.succeeded → mark InvoicePayment as SUCCEEDED
      - payment_intent.failed    → mark InvoicePayment as FAILED
      - charge.refunded          → mark InvoicePayment as REFUNDED
      - invoice.paid             → create SubscriptionPayment (SUCCEEDED)
      - invoice.payment_failed   → create SubscriptionPayment (FAILED)
    """
    stripe_event_id = models.CharField(max_length=255, unique=True, db_index=True)
    event_type = models.CharField(max_length=100, db_index=True)
    payment_type = models.CharField(
        max_length=20, choices=PaymentType.choices, null=True, blank=True
    )
    payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="webhook_events"
    )
    raw_payload = models.JSONField(null=True, blank=True)

    is_processed = models.BooleanField(default=False, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "bma_payment_webhook_event"
        indexes = [
            models.Index(fields=["event_type", "payment_type"]),
            models.Index(fields=["is_processed", "created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} | processed={self.is_processed}"
