from django.db import models
from apps.base.utils.active_manager import ActiveManager
from django.conf import settings
from decimal import Decimal, ROUND_HALF_UP


class BaseModel(models.Model):
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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_state = self._as_dict()

    def _as_dict(self):
        return {
            f.attname: self.__dict__.get(f.attname)
            for f in self._meta.concrete_fields
            if f.attname in self.__dict__
        }

    def get_dirty_fields(self):
        new_state = self._as_dict()
        changes = {}

        for field, old_value in self._original_state.items():
            new_value = new_state[field]
            if old_value != new_value:
                changes[field] = {"old": old_value, "new": new_value}

        return changes


class BaseAddress(BaseModel):
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.ForeignKey('master.City', on_delete=models.SET_NULL, null=True, blank=True)
    pin_code = models.CharField(max_length=20)

    class Meta:
        abstract = True


class GST(BaseModel):
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0.00"))
    gst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    cgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    sgst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    igst_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        db_table = "bma_gst"

    def calculate_gst(self,is_inter_country=False):

        gst_amount=self.gst_amount or Decimal("0.00")
        if is_inter_country:
            self.igst_amount = gst_amount
        else:
            self.cgst_amount = (gst_amount / Decimal("2")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            self.sgst_amount = gst_amount - self.cgst_amount

    def save(self, *args, **kwargs):
        self.calculate_gst()
        super().save(*args, **kwargs)