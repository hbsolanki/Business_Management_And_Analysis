from apps.base.models import BaseModel
from apps.user.models import User
from apps.business.models import Business
from django.db import models
from apps.master.utils.text_choices import TaskStatus


class Task(BaseModel):
    Status = TaskStatus

    business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True)
    branch = models.ForeignKey("business.Branch", on_delete=models.CASCADE, null=True, blank=True, related_name="tasks")
    assignee = models.ForeignKey(User,on_delete=models.CASCADE,related_name="assigned_tasks")
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
            models.Index(fields=["assignee", "status"]),
        ]