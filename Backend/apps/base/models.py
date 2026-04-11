from django.db import models
from apps.base.utils.active_manager import ActiveManager
from django.conf import settings


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
            f.attname: getattr(self, f.attname)
            for f in self._meta.concrete_fields
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
