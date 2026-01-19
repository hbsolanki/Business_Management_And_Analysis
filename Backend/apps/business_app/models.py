from django.db import models
from apps.core.model import BaseModel


class Business(BaseModel):
    name = models.CharField(max_length=100)
    haveEquity = models.IntegerField(default=0, null=True, blank=True)
    assets = models.IntegerField(default=0, null=True, blank=True)
    description = models.CharField(max_length=255)


    class Meta:
        db_table = 'bma_business'