from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
import uuid

from apps.base.models import BaseModel
from apps.base.utils.active_use_manager import ActiveUserManager
from apps.master.utils.text_choices import UserRole

def user_avatar_path(instance, filename):
    ext = filename.split('.')[-1]
    return f"bma/profile_pictures/user_{instance.id}/{uuid.uuid4()}.{ext}"


class User(BaseModel, AbstractUser):
    objects = ActiveUserManager()
    all_objects = UserManager()

    email = models.EmailField(unique=True)
    mobile_number = models.CharField(max_length=10, null=True, blank=True)
    profile_picture = models.ImageField(
        upload_to=user_avatar_path,
        null=True,
        blank=True
    )

    class Meta:
        db_table = "bma_user"
        permissions = [
            ("can_create_owner", "Can create owner"),
            ("can_create_manager", "Can create manager"),
            ("can_create_employee", "Can create employee"),
            ("can_update_salary", "Can update salary"),
            ("can_update_work", "Can update work"),
        ]


    # Properties
    @property
    def branches(self):
        from django.apps import apps
        Branch = apps.get_model('business', 'Branch')
        return Branch.objects.filter(assigned_users__user=self)

    @property
    def assigned_works(self):
        return self.branch_works.all()

    @property
    def salary(self):
        try:
            return self.employee_details.salary
        except (AttributeError, models.ObjectDoesNotExist):
            return 0

    @property
    def address(self):
        try:
            return self.employee_details.address
        except (AttributeError, models.ObjectDoesNotExist):
            return None

    @property
    def description(self):
        try:
            return self.employee_details.bio
        except (AttributeError, models.ObjectDoesNotExist):
            return ""

    @property
    def role(self):
        try:
            return self.business_roles.first()
        except (AttributeError, models.ObjectDoesNotExist):
            return None

    @property
    def business(self):
        try:
            role_obj = self.business_roles.first()
            return role_obj.business if role_obj else None
        except (AttributeError, models.ObjectDoesNotExist):
            return None

    @property
    def role_name(self):
        from apps.employee.models import UserRole
        try:
            role_obj = self.business_roles.first()
            return role_obj.role if role_obj else None
        except (AttributeError, models.ObjectDoesNotExist):
            return UserRole.EMPLOYEE

    @property
    def business_id(self):
        bus = self.business
        return bus.id if bus else None

    @property
    def assigned_works_list(self):
        return list(self.branch_works.values_list('work_type', flat=True).distinct())

    def __str__(self):
        return self.username
