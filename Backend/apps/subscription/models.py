from django.db import models
from apps.base.models import BaseModel
from django.utils import timezone
from apps.business.models import Business

class Plan(BaseModel):
    name = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration_days = models.IntegerField(null=True, blank=True)

    max_products = models.IntegerField(null=True, blank=True)
    max_invoices= models.IntegerField(null=True, blank=True)
    max_staff = models.IntegerField(null=True, blank=True)
    max_branches = models.IntegerField(null=True, blank=True)

    has_advanced_analytics = models.BooleanField(default=False)
    has_chat = models.BooleanField(default=False)
    has_api_access = models.BooleanField(default=False)
    has_ai_agent = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "bma_subscription_plan"

class Subscription(BaseModel):
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

    payment_mode=models.CharField(max_length=10, null=True, blank=True)
    transaction_id=models.IntegerField(null=True, blank=True)
    payment_date=models.DateTimeField(null=True, blank=True)


    is_trial = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    payment_reference = models.CharField(max_length=255, null=True, blank=True)

    def is_valid(self):
        return self.is_active and self.end_date > timezone.now()

    class Meta:
        db_table = "bma_subscription"
        indexes = [
            models.Index(fields=["business","plan"]),
        ]

class Usage(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE,null=True, blank=True)

    product_created=models.IntegerField(default=0)
    invoices_created = models.IntegerField(default=0)
    staff_created = models.IntegerField(default=0)
    branches_created = models.IntegerField(default=0)

    class Meta:
        db_table = "bma_plan_usage"
        indexes = [
            models.Index(fields=["subscription"]),
        ]

