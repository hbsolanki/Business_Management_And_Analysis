from datetime import timezone
from apps.base.models import BaseModel
from apps.user.models import User
from apps.business.models import Business
from django.db import models


class Task(BaseModel):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, null=True, blank=True)
    assignee = models.ForeignKey(User,on_delete=models.CASCADE,related_name="assigned_tasks")
    assigned_by = models.ForeignKey(User,on_delete=models.CASCADE,related_name="created_tasks",)
    status = models.CharField(max_length=15,choices=Status.choices,default=Status.PENDING,)

    title = models.CharField(max_length=255)
    description = models.TextField()
    remarks = models.TextField(null=True, blank=True)
    completed_at=models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "bma_task"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["assignee"]),
            models.Index(fields=["assigned_by"]),
        ]