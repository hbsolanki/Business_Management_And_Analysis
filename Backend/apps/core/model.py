from django.db import models
from apps.core.ActiveManager import ActiveManager
from django.conf import settings


class BaseModel(models.Model):
    objects = ActiveManager()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name="%(app_label)s_%(class)s_created",null=True,blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE,related_name="%(app_label)s_%(class)s_updated",null=True,blank=True)
    is_deleted = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
