from apps.notification.models import Notification
from apps.notification.utils import send_notification as base_send_notification
from apps.tasks.models import Task

def send_task_assigned_notification(task: Task, request=None):
    users_to_notify = []
    for assignment in task.assignments.all():
        if assignment.assignee_type.model == 'user':
            users_to_notify.append(assignment.assignee)
        elif assignment.assignee_type.model == 'taskgroup':
            users_to_notify.extend([member.user for member in assignment.assignee.members.all()])
        
    for user in set(users_to_notify):
        base_send_notification(
            user=user,
            actor=task.assigned_by,
            title=f"New Task: {task.title}",
            content=f"You have been assigned a new task by {task.assigned_by.username}",
            action_type=Notification.ActionType.TASK_ASSIGNED,
            action_link=f"/task/{task.id}/",
            request=request
        )

def send_task_completed_notification(task: Task, request=None):
    actor = getattr(request, 'user', None)
    if not actor:
        first_user_assignment = task.assignments.filter(assignee_type__model='user').first()
        actor = first_user_assignment.assignee if first_user_assignment else None

    actor_name = actor.username if actor else "Someone"

    base_send_notification(
        user=task.assigned_by,
        actor=actor,
        title=f"Task Completed: {task.title}",
        content=f"Task has been marked as completed by {actor_name}",
        action_type=Notification.ActionType.TASK_COMPLETED,
        action_link=f"/task/{task.id}/",
        request=request
    )
