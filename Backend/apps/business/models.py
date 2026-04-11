from django.db import models
from apps.base.models import BaseModel, BaseAddress


class BranchAddress(BaseAddress):
    class Meta:
        db_table = "bma_branch_address"

    def __str__(self):
        return f"Branch Address: {self.address_line_1}"

class Business(BaseModel):
    name = models.CharField(max_length=100,null=True,blank=True)
    gst_number = models.CharField(max_length=20,unique=True, null=True, blank=True)
    description = models.CharField(max_length=255,null=True, blank=True)


    class Meta:
        db_table = 'bma_business'

        permissions = [
            ("update_business", "Can update business"),
        ]

class Branch(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=100)
    address = models.ForeignKey(BranchAddress, on_delete=models.SET_NULL, null=True, blank=True, related_name="branches")
    contact_number = models.CharField(max_length=15, null=True, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'bma_branch'
        verbose_name_plural = "Branches"
        constraints = [
            models.UniqueConstraint(
                fields=["business"],
                condition=models.Q(is_default=True),
                name="unique_default_branch_per_business"
            )
        ]

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class BusinessCustomer(BaseModel):
    gender_types = [
        ("MALE", "Male"),
        ("FEMALE", "Female"),
    ]
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="business_customers")
    customer_business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True, related_name="customer_link")
    name = models.CharField(max_length=100)
    mobile_number = models.CharField(max_length=11)
    email = models.EmailField(default='', null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(choices=gender_types, max_length=10, null=True, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    same_platform = models.BooleanField(default=False)

    class Meta:
        db_table = "bma_business_customer"
        indexes = [
            models.Index(fields=["business", "mobile_number"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=['business', 'mobile_number'], name='unique_business_customer')
        ]

    def __str__(self):
        return f"{self.name} - {self.mobile_number}"