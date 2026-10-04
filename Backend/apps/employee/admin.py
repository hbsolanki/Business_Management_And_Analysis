from django.contrib import admin
from apps.employee.models import UserBranch, UserBranchWork, UserBusinessRole, EmployeeDetails

admin.site.register(UserBranch)
admin.site.register(UserBranchWork)
admin.site.register(UserBusinessRole)
admin.site.register(EmployeeDetails)
