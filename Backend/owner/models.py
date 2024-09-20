# models.py

from django.db import models

class Owner(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    businessid = models.CharField(max_length=200)
    mobile_number=models.CharField(max_length=100)
    
    def __str__(self):
        return self.name
