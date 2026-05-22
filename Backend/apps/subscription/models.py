from django.db import models
from django.db.models import Q
from apps.base.models import BaseModel
from django.utils import timezone
from apps.business.models import Business


class Plan(BaseModel):
    name = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration_days = models.IntegerField(null=True, blank=True)

    max_products = models.IntegerField(null=True, blank=True)
    max_invoices = models.IntegerField(null=True, blank=True)
    max_staff = models.IntegerField(null=True, blank=True)
    max_branches = models.IntegerField(null=True, blank=True)

    has_advanced_analytics = models.BooleanField(default=False)
    has_chat = models.BooleanField(default=False)
    has_api_access = models.BooleanField(default=False)
    has_ai_agent = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "bma_subscription_plan"
        constraints = [
            models.UniqueConstraint(
                fields=["name", "price"], name="unique_plan_name_price"
            )
        ]


class Subscription(BaseModel):
    class SubscriptionStatus(models.TextChoices):
        PENDING_PAYMENT = "PENDING_PAYMENT", "Pending Payment"
        ACTIVE = "ACTIVE", "Active"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"
        FAILED = "FAILED", "Failed"
        SUPERSEDED = "SUPERSEDED", "Superseded"

    business = models.ForeignKey(Business, on_delete=models.CASCADE)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)

    price = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    plan_name = models.CharField(max_length=50, null=True, blank=True)
    duration_days = models.IntegerField(null=True, blank=True)

    max_products = models.IntegerField(null=True, blank=True)
    max_invoices = models.IntegerField(null=True, blank=True)
    max_staff = models.IntegerField(null=True, blank=True)
    max_branches = models.IntegerField(null=True, blank=True)

    has_advanced_analytics = models.BooleanField(null=True)
    has_chat = models.BooleanField(null=True)
    has_api_access = models.BooleanField(null=True)
    has_ai_agent = models.BooleanField(null=True)

    start_date = models.DateTimeField()
    end_date = models.DateTimeField()

    payment_mode = models.CharField(max_length=10, null=True, blank=True)
    transaction_id = models.CharField(max_length=255, null=True, blank=True)
    payment_date = models.DateTimeField(null=True, blank=True)

    is_trial = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.PENDING_PAYMENT,
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)
    expired_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)

    payment_reference = models.CharField(max_length=255, null=True, blank=True)

    def is_valid(self):
        return self.is_active and self.end_date > timezone.now()

    class Meta:
        db_table = "bma_subscription"
        indexes = [
            models.Index(fields=["business", "plan"]),
            models.Index(fields=["business", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["business"],
                condition=Q(is_active=True),
                name="unique_active_subscription_per_business",
            ),
        ]


class Usage(models.Model):
    subscription = models.OneToOneField(
        Subscription, on_delete=models.CASCADE, related_name="usage"
    )

    product_created = models.IntegerField(default=0)
    invoices_created = models.IntegerField(default=0)
    staff_created = models.IntegerField(default=0)
    branches_created = models.IntegerField(default=0)

    class Meta:
        db_table = "bma_plan_usage"
        indexes = [
            models.Index(fields=["subscription"]),
        ]


class SubscriptionWebhookEvent(models.Model):
    stripe_event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)
    payment_type = models.CharField(max_length=50, null=True, blank=True)
    subscription = models.ForeignKey(
        Subscription, on_delete=models.SET_NULL, null=True, blank=True
    )
    is_processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "bma_subscription_webhook_event"
        indexes = [
            models.Index(fields=["event_type", "payment_type"]),
            models.Index(fields=["created_at"]),
        ]
