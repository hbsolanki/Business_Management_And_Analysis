from apps.base.models import BaseModel
from apps.user.models import User
from apps.business.models import Business
from django.db import models
from apps.master.utils.text_choices import TaskStatus
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class TaskGroup(BaseModel):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='task_groups')
    name = models.CharField(max_length=255)
    is_private = models.BooleanField(default=False)

    class Meta:
        db_table = "bma_task_group"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["business", "name"], condition=models.Q(is_deleted=False), name="unique_task_group_name_per_business")
        ]

class TaskGroupMember(BaseModel):
    group = models.ForeignKey(TaskGroup, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='task_group_memberships')

    class Meta:
        db_table = "bma_task_group_member"
        constraints = [
            models.UniqueConstraint(fields=["group", "user"], condition=models.Q(is_deleted=False), name="unique_task_group_member")
        ]

class TaskAssignment(BaseModel):
    task = models.ForeignKey('Task', on_delete=models.CASCADE, related_name="assignments")
    assignee_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    assignee_id = models.PositiveIntegerField()
    assignee = GenericForeignKey('assignee_type', 'assignee_id')

    class Meta:
        db_table = "bma_task_assignment"
        indexes = [
            models.Index(fields=["assignee_type", "assignee_id"]),
        ]


class Task(BaseModel):
    Status = TaskStatus

    business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True)
    branch = models.ForeignKey("business.Branch", on_delete=models.CASCADE, null=True, blank=True, related_name="tasks")
    assigned_by = models.ForeignKey(User,on_delete=models.CASCADE,related_name="created_tasks",)
    status = models.CharField(max_length=15,choices=Status.choices,default=Status.PENDING,)

    title = models.CharField(max_length=255)
    description = models.TextField()
    remarks = models.TextField(null=True, blank=True)
    completed_at=models.DateTimeField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "bma_task"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["business", "-created_at"]),
            models.Index(fields=["status"], name="task_status_idx"),
        ]
