from django.contrib import admin
from apps.tasks.models import Task, TaskGroup, TaskGroupMember, TaskAssignment

admin.site.register(Task)
admin.site.register(TaskGroup)
admin.site.register(TaskGroupMember)
admin.site.register(TaskAssignment)