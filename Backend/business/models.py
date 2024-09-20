from django.db import models

# Create your models here.
class Business(models.Model):
    name=models.CharField(max_length=100)
    debt=models.CharField(max_length=100)
    haveEquity=models.CharField(max_length=100)
    profit=models.CharField
    assets=models.CharField(max_length=100)
    product=models.CharField(max_length=100)
    employee=models.CharField(max_length=100)
    inventory=models.CharField(max_length=100)
    description=models.CharField(max_length=100)
