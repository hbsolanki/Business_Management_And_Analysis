from django.db import models
from apps.business_app.models import Business
from apps.core.model import BaseModel
from apps.user.models import  User
from apps.product_category.models import ProductCategory

class Product(BaseModel):
    business=models.ForeignKey(to=Business, on_delete=models.CASCADE,related_name='products')
    name = models.CharField(max_length=50,null=False,blank=False)
    description = models.TextField(default="")

    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2)

    input_gst_rate = models.DecimalField(max_digits=5, decimal_places=2)
    output_gst_rate = models.DecimalField(max_digits=5, decimal_places=2)

    net_profit = models.DecimalField(max_digits=12,decimal_places=2,editable=False)


    product_category=models.ForeignKey(to=ProductCategory, on_delete=models.SET_NULL,null=True,blank=True)
    sku=models.CharField(max_length=50)

    def save(self, *args, **kwargs):

        self.net_profit = self.base_price - self.cost_price
        super().save(*args, **kwargs)

    class Meta:
            db_table = "bma_product"
            indexes = [models.Index(fields=['business', '-created_at'])]
            constraints = [models.UniqueConstraint(fields=["business", "sku"], name="unique_sku_per_business")]

    def __str__(self):
            return self.name
