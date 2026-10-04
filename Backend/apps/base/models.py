from django.db import models
from apps.base.utils.active_manager import ActiveManager
from apps.base.mixins import DirtyFieldsMixin
from django.conf import settings
from decimal import Decimal, ROUND_HALF_UP


class BaseModel(DirtyFieldsMixin, models.Model):
    objects = ActiveManager()
    all_objects = models.Manager()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name="%(app_label)s_%(class)s_created",null=True,blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name="%(app_label)s_%(class)s_updated",null=True,blank=True)
    is_deleted = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True


class Address(BaseModel):
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.ForeignKey('master.City', on_delete=models.SET_NULL, null=True, blank=True)
    pin_code = models.CharField(max_length=20)

    class Meta:
        db_table = "bma_address"

    def __str__(self):
        return f"Address: {self.address_line_1}"


class GST(BaseModel):
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        db_table = "bma_gst"