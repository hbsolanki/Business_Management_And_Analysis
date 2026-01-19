from django.db import models
from apps.business_app.models import Business
from apps.core.model import BaseModel


class Customer(BaseModel):
    gender_types = [
        ("MALE", "Male"),
        ("FEMALE", "Female"),
    ]
    business = models.ForeignKey(Business,on_delete=models.CASCADE,related_name="business_customer")
    name = models.CharField(max_length=100)
    mobile_number = models.CharField(max_length=11)
    email = models.EmailField(default='',null=True,blank=True)
    address = models.TextField(default='',null=True,blank=True)
    age = models.IntegerField(null=True,blank=True)
    gender = models.CharField(choices=gender_types,max_length=10,null=True,blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "bma_customer"
        indexes=[
            models.Index(fields=["business"]),
        ]