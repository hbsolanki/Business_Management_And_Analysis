from django.db import models
from django.core.validators import MinValueValidator
from apps.business.models import Business
from apps.base.models import BaseModel


class ProductCategory(BaseModel):
    name = models.CharField(max_length=200)
    description = models.TextField()
    business = models.ForeignKey(to=Business, on_delete=models.CASCADE)

    class Meta:
        db_table = "bma_product_category"
        indexes = [models.Index(fields=["business", "-created_at"])]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "name"],
                condition=models.Q(is_deleted=False),
                name="unique_product_category_per_business",
            )
        ]


class Product(BaseModel):
    business = models.ForeignKey(
        to=Business, on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=50, null=False, blank=False)
    description = models.TextField(default="")

    base_price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )
    cost_price = models.DecimalField(
        max_digits=12, decimal_places=2, validators=[MinValueValidator(0)]
    )

    input_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    output_gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    net_profit = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    product_category = models.ForeignKey(
        to=ProductCategory, on_delete=models.SET_NULL, null=True, blank=True
    )
    hsn_code = models.CharField(max_length=20, null=True, blank=True)
    sku = models.CharField(max_length=50)
    low_stock_limit = models.IntegerField(default=5, null=True, blank=True)

    def save(self, *args, **kwargs):
        self.net_profit = self.base_price - self.cost_price
        super().save(*args, **kwargs)

    class Meta:
        db_table = "bma_product"
        indexes = [models.Index(fields=["business", "-created_at"])]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "sku"],
                condition=models.Q(is_deleted=False),
                name="unique_sku_per_business",
            )
        ]

    def __str__(self):
        return self.name
