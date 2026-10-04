from django.db import models
from apps.base.models import BaseModel, Address
from apps.master.utils.text_choices import GSTRegistrationType, GenderType


class Business(BaseModel):
    name = models.CharField(max_length=100,null=True,blank=True)
    description = models.CharField(max_length=255,null=True, blank=True)


    class Meta:
        db_table = 'bma_business'

        permissions = [
            ("update_business", "Can update business"),
        ]

class BusinessGSTProfile(BaseModel):
    business = models.OneToOneField(Business, on_delete=models.CASCADE, related_name="gst_profile")
    gstin = models.CharField(max_length=15, unique=True)
    state_code = models.CharField(max_length=2) # e.g. "27" for Maharashtra
    registration_type = models.CharField(
        choices=GSTRegistrationType.choices, 
        max_length=15, 
        default=GSTRegistrationType.REGULAR
    )
    
    # Optional fields for more advanced features
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "bma_business_gst_profile"

    def save(self, *args, **kwargs):
        if self.gstin and len(self.gstin) >= 2:
            self.state_code = self.gstin[:2]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"GSTIN: {self.gstin} ({self.business.name})"

class Branch(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=100)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, related_name="branches")
    contact_number = models.CharField(max_length=15, null=True, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'bma_branch'
        verbose_name_plural = "Branches"
        indexes = [
            models.Index(fields=["business"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["business"],
                condition=models.Q(is_default=True, is_deleted=False),
                name="unique_default_branch_per_business"
            ),
            models.UniqueConstraint(
                fields=["business", "name"],
                condition=models.Q(is_deleted=False),
                name="unique_branch_name_per_business"
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class BusinessCustomer(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="business_customers")
    customer_business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True, related_name="customer_link")
    name = models.CharField(max_length=100)
    mobile_number = models.CharField(max_length=11)
    email = models.EmailField(default='', null=True, blank=True)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, related_name="customers")
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(choices=GenderType.choices, max_length=10, null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    same_platform = models.BooleanField(default=False)

    class Meta:
        db_table = "bma_business_customer"
        indexes = [
            models.Index(fields=["business", "mobile_number"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['business', 'mobile_number'], 
                condition=models.Q(is_deleted=False),
                name='unique_business_customer'
            ),
            models.UniqueConstraint(
                fields=["business", "customer_business"],
                condition=models.Q(customer_business__isnull=False, is_deleted=False),
                name="unique_customer_business_link"
            )
        ]

    def __str__(self):
        return f"{self.name} - {self.mobile_number}"