from django.db import models
from apps.base.models import BaseModel, Address
from apps.master.utils.text_choices import UserRole, WorkType

from apps.business.models import Business, Branch

class UserBusinessRole(BaseModel):
    user = models.ForeignKey('user.User', on_delete=models.CASCADE, related_name="business_roles")
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="user_roles", null=True, blank=True)
    role = models.CharField(max_length=10, choices=UserRole.choices, default=UserRole.EMPLOYEE)

    class Meta:
        db_table = "bma_user_business_role"
        constraints = [
            models.UniqueConstraint(fields=["user", "business"], condition=models.Q(is_deleted=False), name="unique_user_business_role")
        ]
        permissions = [
            ("change_owner_role", "Can change owner role"),
            ("change_manager_role", "Can change manager role"),
            ("change_employee_role", "Can change employee role"),
            ("can_create_employee", "Can create employee"),
            ("can_create_manager", "Can create manager"),
        ]


class UserBranch(BaseModel):
    user = models.ForeignKey('user.User', on_delete=models.CASCADE, related_name="assigned_branches")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="assigned_users")

    class Meta:
        db_table = "bma_user_branch"
        constraints = [
            models.UniqueConstraint(fields=["user", "branch"], condition=models.Q(is_deleted=False), name="unique_user_branch")
        ]
        permissions = [
            ("change_branch_employee", "Can change branch for employee"),
            ("change_branch_manager", "Can change branch for manager"),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.branch.name}"

class UserBranchWork(BaseModel):
    user = models.ForeignKey('user.User', on_delete=models.CASCADE, related_name="branch_works")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="user_works")
    work_type = models.CharField(max_length=20, choices=WorkType.choices)

    class Meta:
        db_table = "bma_user_branch_work"
        constraints = [
            models.UniqueConstraint(fields=["user", "branch", "work_type"], condition=models.Q(is_deleted=False), name="unique_user_branch_work")
        ]
        permissions = [
            ("change_employee_work", "Can change work type for employee"),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.branch.name} ({self.work_type})"

class EmployeeDetails(BaseModel):
    user = models.OneToOneField('user.User', on_delete=models.CASCADE, related_name="employee_details")
    salary = models.IntegerField(default=0)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True, blank=True, related_name="employees")
    bio = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "bma_employee_details"
        permissions = [
            ("change_employee_salary", "Can change employee salary"),
            ("change_manager_salary", "Can change manager salary"),
        ]

    def __str__(self):
        return f"Details for {self.user.username}"