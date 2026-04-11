from django.db import models
from apps.user.models import User
from apps.base.models import BaseModel

class Notification(BaseModel):

    class ActionType(models.TextChoices):
        TASK_ASSIGNED = "TASK_ASSIGNED", "Task Assigned"
        TASK_COMPLETED = "TASK_COMPLETED", "Task Completed"
        TASK_UPDATED = "TASK_UPDATED", "Task Updated"
        COMMENT = "COMMENT", "Comment"
        SUBSCRIPTION_PURCHASED = "SUBSCRIPTION_PURCHASED", "Subscription Purchased"
        INVOICE_PAID = "INVOICE_PAID", "Invoice Paid"
        SYSTEM = "SYSTEM", "System"
        LOW_STOCK_ALERT = "LOW_STOCK_ALERT", "Low Stock Alert"
        MESSAGE_BROADCAST = "MESSAGE_BROADCAST", "Message Broadcast"

    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name='notifications')
    actor = models.ForeignKey(User,on_delete=models.SET_NULL,null=True,blank=True,related_name='triggered_notifications')
    title = models.CharField(max_length=100)
    content = models.TextField()
    action_type=models.CharField(max_length=50,choices=ActionType.choices,null=True,blank=True)
    action_link = models.TextField(null=True,blank=True)
    is_read = models.BooleanField(default=False)


    class Meta:
        db_table = 'bma_notification'
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=['user']),
        ]
