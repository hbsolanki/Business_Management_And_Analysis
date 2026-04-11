from apps.notification.models import Notification
from apps.notification.utils import send_notification as base_send_notification
from apps.tasks.models import Task

def send_task_assigned_notification(task: Task, request=None):
    base_send_notification(
        user=task.assignee,
        actor=task.assigned_by,
        title=f"New Task: {task.title}",
        content=f"You have been assigned a new task by {task.assigned_by.username}",
        action_type=Notification.ActionType.TASK_ASSIGNED,
        action_link=f"/task/{task.id}/",
        request=request
    )

def send_task_completed_notification(task: Task, request=None):
    base_send_notification(
        user=task.assigned_by,
        actor=task.assignee,
        title=f"Task Completed: {task.title}",
        content=f"Task has been marked as completed by {task.assignee.username}",
        action_type=Notification.ActionType.TASK_COMPLETED,
        action_link=f"/task/{task.id}/",
        request=request
    )
