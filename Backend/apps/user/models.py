from django.db import models
from django.contrib.auth.models import AbstractUser,UserManager
from apps.business_app.models import Business
from apps.core.model import BaseModel
from apps.core.ActiveUserManager import ActiveUserManager

class User(BaseModel,AbstractUser):
    objects = ActiveUserManager()
    all_objects = UserManager()

    class Role(models.TextChoices):
        OWNER = "OWNER", "Owner"
        MANAGER = "MANAGER", "Manager"
        EMPLOYEE = "EMPLOYEE", "Employee"

    class Work(models.TextChoices):
        PRODUCT = "PRODUCT","Production"
        INVENTORY = "INVENTORY", "Inventory"
        EMPLOYEE = "EMPLOYEE", "Employee"
        ANALYTICS = "ANALYTICS", "Analytics"
        INVOICE = "INVOICE", "Invoice"


    role = models.CharField(max_length=10,choices=Role.choices, default=Role.EMPLOYEE,)

    business = models.ForeignKey(Business, on_delete=models.SET_NULL,null=True, blank=True)
    mobile_number = models.CharField(max_length=10)
    salary=models.IntegerField(default=0)
    address = models.TextField(blank=True,null=True)
    profile_picture=models.ImageField(upload_to="profile_picture",null=True,blank=True)
    work=models.CharField(max_length=10, choices=Work.choices,null=True,blank=True)
    description=models.TextField(blank=True,null=True)

    class Meta:
        db_table ="bma_user"
        constraints = [
            models.UniqueConstraint(fields=["business", "username"], name="unique_username_per_business"),]

    def __str__(self):
        return self.username
