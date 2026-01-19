from django.db import models
from apps.user.models import User
from apps.business_app.models import Business
from apps.core.model import BaseModel

class ProductCategory(BaseModel):
    name = models.CharField(max_length=200)
    description = models.TextField()
    business = models.ForeignKey(to=Business, on_delete=models.CASCADE)

    class Meta:
        db_table = "bma_product_category"
        indexes = [models.Index(fields=['business', '-created_at'])]
        constraints = [models.UniqueConstraint(fields=["business", "name"], name="unique_product_category_per_business")]
